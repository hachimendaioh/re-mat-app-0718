// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
// v2のhttpsモジュールをインポート
const { onCall, HttpsError } = require("firebase-functions/v2/https");

// FirestoreモジュールとAdmin SDKの初期化に必要なものをインポート
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const logger = require("firebase-functions/logger");

// Stripe SDKをインポート
const stripe = require('stripe');

// Firebase Admin SDKの初期化
initializeApp();

// Firestoreのインスタンスを取得
const db = getFirestore();

// Stripeクライアントを格納する変数 (遅延初期化のため)
let stripeClientInstance = null;

exports.processPayment = onCall(async (request) => {
  logger.info("processPayment function started.");
  logger.info("Received data from client:", request.data);
  logger.info("Auth context:", request.auth);

  if (!stripeClientInstance) {
    logger.info("Stripe client instance not initialized. Attempting to initialize.");
    let stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey || stripeSecretKey.length === 0) {
      logger.error("Stripe secret key is NOT found or is empty in environment variables (process.env.STRIPE_SECRET_KEY).");
      throw new HttpsError('internal', 'Stripe secret key is not configured. Please set it using `firebase functions:secrets:set STRIPE_SECRET_KEY=\"YOUR_KEY\"`.');
    } else {
      logger.info(`Stripe secret key found. Length: ${stripeSecretKey.length}. (Value masked for security)`);
    }
    
    try {
      stripeClientInstance = stripe(stripeSecretKey);
      logger.info("Stripe client initialized successfully.");
    } catch (initError) {
      logger.error("Error initializing Stripe client with provided key:", initError.message, initError);
      throw new HttpsError('internal', 'Failed to initialize Stripe client with the provided key.', initError.message);
    }
  } else {
    logger.info("Stripe client instance already initialized. Skipping re-initialization.");
  }

  // receiverNameをclientReceiverNameとして受け取り、後でactualReceiverNameを決定する
  const { receiverId, amount: clientAmount, items: clientItems, senderName, receiverName: clientReceiverName, orderId } = request.data;
  const senderId = request.auth.uid;
  const appId = "re-mat-mvp"; // アプリケーションIDを直接指定

  let finalAmount = clientAmount;
  let finalItems = clientItems;
  let actualReceiverName = clientReceiverName; // 初期値はクライアントから渡されたもの

  // orderIdがあればFirestoreから金額とアイテム情報を取得し直す
  if (orderId) {
    logger.info(`orderId (${orderId}) found. Fetching order details from Firestore.`);
    try {
      const orderDocRef = db.doc(`artifacts/${appId}/orders/${orderId}`);
      const orderDoc = await orderDocRef.get();

      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        finalAmount = orderData.amount; // Firestoreの金額を信頼
        finalItems = orderData.items || null; // Firestoreのアイテムリストを信頼
        // orderDataにreceiverNameがあればそれを使用 (ReceivePaymentScreenでstoreNameが設定されている場合)
        actualReceiverName = orderData.receiverName || actualReceiverName; 
        logger.info(`Order details fetched for orderId ${orderId}: Amount=${finalAmount}, Items=${JSON.stringify(finalItems)}, ReceiverName=${actualReceiverName}`);
      } else {
        logger.warn(`Order document not found for orderId: ${orderId}. Falling back to client-provided data.`);
      }
    } catch (firestoreError) {
      logger.error(`Error fetching order details for orderId ${orderId}:`, firestoreError);
      throw new HttpsError('internal', '注文情報の取得中にエラーが発生しました。', firestoreError.message);
    }
  }

  // ★追加: receiverIdのuserProfileからstoreNameを取得し、actualReceiverNameを上書きする ★
  if (receiverId) {
    try {
      const receiverProfileRef = db.doc(`artifacts/${appId}/users/${receiverId}/profile/userProfile`);
      const receiverProfileSnap = await receiverProfileRef.get();
      if (receiverProfileSnap.exists()) {
        const receiverProfileData = receiverProfileSnap.data();
        if (receiverProfileData.isStore && receiverProfileData.storeName) {
          logger.info(`Receiver (${receiverId}) is a store. Using storeName: ${receiverProfileData.storeName}`);
          actualReceiverName = receiverProfileData.storeName; // 店舗名を優先
        } else {
          logger.info(`Receiver (${receiverId}) is not a store or storeName not found. Using receiverName from client/Order.`);
        }
      }
    } catch (profileError) {
      logger.error(`Error fetching receiver profile for storeName for receiverId ${receiverId}:`, profileError);
      // プロフィール取得エラー時は、既存のactualReceiverNameをそのまま使用
    }
  }

  // 取得した最終的な金額でバリデーション
  if (!senderId) {
    logger.error("Authentication failed: senderId is missing.");
    throw new HttpsError('unauthenticated', '認証されていません。ログインしてください。');
  }
  if (!receiverId || typeof finalAmount !== 'number' || finalAmount <= 0) {
    logger.error(`Invalid arguments after orderId processing: receiverId=${receiverId}, finalAmount=${finalAmount}, typeof finalAmount=${typeof finalAmount}`);
    throw new HttpsError('invalid-argument', '無効な受取人IDまたは送金額です。');
  }
  
  if (senderId === receiverId) {
    logger.error(`Invalid arguments: senderId (${senderId}) is same as receiverId (${receiverId}).`);
    throw new HttpsError('invalid-argument', '自分自身に送金することはできません。');
  }

  try {
    logger.info("Attempting to create Stripe Payment Intent.");
    const paymentIntent = await stripeClientInstance.paymentIntents.create({
      amount: finalAmount,
      currency: 'jpy',
      payment_method_types: ['card'],
      description: `Payment from ${senderName} to ${actualReceiverName}`, // actualReceiverNameを使用
      metadata: {
        sender_id: senderId,
        receiver_id: receiverId,
        app_id: appId,
        order_id: orderId || 'なし',
        items: finalItems ? JSON.stringify(finalItems) : null,
      },
    });
    logger.info("Stripe Payment Intent created successfully:", { paymentIntentId: paymentIntent.id });
  } catch (error) {
    logger.error("Stripe payment intent creation failed:", error);
    throw new HttpsError("internal", "Stripe payment failed.", { details: error.message });
  }

  // Firestoreの参照パスを定義
  const senderProfileRef = db.doc(`artifacts/${appId}/users/${senderId}/profile/userProfile`);
  const receiverProfileRef = db.doc(`artifacts/${appId}/users/${receiverId}/profile/userProfile`);

  const senderTransactionsColRef = db.collection(`artifacts/${appId}/users/${senderId}/transactions`);
  const receiverTransactionsColRef = db.collection(`artifacts/${appId}/users/${receiverId}/transactions`);

  const senderNotificationsColRef = db.collection(`artifacts/${appId}/users/${senderId}/notifications`);
  const receiverNotificationsColRef = db.collection(`artifacts/${appId}/users/${receiverId}/notifications`);

  try {
    logger.info("Starting Firestore transaction.");
    await db.runTransaction(async (transaction) => {
      // 送金元ユーザーのプロフィールを取得
      const senderDoc = await transaction.get(senderProfileRef);
      if (!senderDoc.exists) {
        throw new HttpsError('not-found', '送金元ユーザーのプロフィールが見つかりません。');
      }

      const senderData = senderDoc.data();
      const currentSenderBalance = senderData.balance || 0;
      const currentSenderPoints = senderData.points || 0;
      const actualSenderName = senderData.name || senderName || '不明なユーザー'; // 送金元は常にユーザー名

      if (currentSenderBalance < finalAmount) {
        throw new HttpsError('failed-precondition', '残高が不足しています。');
      }

      const receiverDoc = await transaction.get(receiverProfileRef);
      if (!receiverDoc.exists) {
        throw new HttpsError('not-found', '受取人ユーザーのプロフィールが見つかりません。');
      }

      const currentReceiverBalance = receiverDoc.data().balance || 0;

      const newSenderBalance = currentSenderBalance - finalAmount;
      const newSenderPoints = currentSenderPoints + Math.floor(finalAmount * 0.03);
      transaction.update(senderProfileRef, {
        balance: newSenderBalance,
        points: newSenderPoints,
      });

      const newReceiverBalance = currentReceiverBalance + finalAmount;
      transaction.update(receiverProfileRef, {
        balance: newReceiverBalance,
      });

      // 送金元と受取人の取引履歴を追加
      transaction.set(senderTransactionsColRef.doc(), {
        store: actualReceiverName, // ★修正: actualReceiverNameを使用 ★
        amount: -finalAmount,
        date: FieldValue.serverTimestamp(),
        type: 'payment',
        notification_type: 'info',
        timestamp: FieldValue.serverTimestamp(),
        receiverId: receiverId,
        orderId: orderId || null,
        items: finalItems || null,
      });

      transaction.set(receiverTransactionsColRef.doc(), {
        store: actualSenderName, // ★修正: actualSenderNameを使用 ★
        amount: finalAmount,
        date: FieldValue.serverTimestamp(),
        type: 'receive',
        notification_type: 'info',
        timestamp: FieldValue.serverTimestamp(),
        senderId: senderId,
        orderId: orderId || null,
        items: finalItems || null,
      });

      // 送金元と受取人に通知を追加
      transaction.set(senderNotificationsColRef.doc(), {
        text: `¥${finalAmount.toLocaleString()}を${actualReceiverName}に支払いました。現在の残高：¥${newSenderBalance.toLocaleString()}`, // ★修正: actualReceiverNameを使用 ★
        read: false,
        type: 'info',
        timestamp: FieldValue.serverTimestamp(),
        orderId: orderId || null,
      });
      
      transaction.set(receiverNotificationsColRef.doc(), {
        text: `¥${finalAmount.toLocaleString()}を${actualSenderName}から受け取りました。現在の残高：¥${newReceiverBalance.toLocaleString()}`, // ★修正: actualSenderNameを使用 ★
        read: false,
        type: 'info',
        timestamp: FieldValue.serverTimestamp(),
        orderId: orderId || null,
      });

      logger.info("Firestore transaction for payment completed successfully.", { senderId, receiverId, amount: finalAmount, orderId: orderId });
    });

    if (orderId) {
      const orderDocRef = db.doc(`artifacts/${appId}/orders/${orderId}`);
      await orderDocRef.update({ status: 'completed' });
      logger.info(`Order status updated to 'completed' for orderId: ${orderId}`);
    }

    logger.info("processPayment function completed successfully.");
    return { success: true, message: '送金が完了しました。' };

  } catch (error) {
    logger.error("Firestore transaction or general function error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      'internal',
      '送金処理中に予期せぬエラーが発生しました。',
      error.message || error.toString()
    );
  }
});
