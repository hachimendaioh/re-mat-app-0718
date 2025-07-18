// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
// v2のhttpsモジュールをインポート
const { onCall, HttpsError } = require("firebase-functions/v2/https");

// ★★★ ここを正確に確認・修正してください ★★★
// getFirestore と FieldValue は同じ行でインポート
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
// runTransaction は別の行で明示的にインポート
const { runTransaction } = require('firebase-admin/firestore'); 

const { initializeApp } = require("firebase-admin/app");

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

  const { receiverId, amount, items, senderName, receiverName } = request.data;
  const senderId = request.auth.uid;
  const appId = "re-mat-mvp";

  if (!senderId) {
    logger.error("Authentication failed: senderId is missing.");
    throw new HttpsError('unauthenticated', '認証されていません。ログインしてください。');
  }
  if (!receiverId || typeof amount !== 'number' || amount <= 0) {
    logger.error(`Invalid arguments: receiverId=${receiverId}, amount=${amount}, typeof amount=${typeof amount}`);
    throw new HttpsError('invalid-argument', '無効な受取人IDまたは送金額です。');
  }
  
  if (senderId === receiverId) {
    logger.error(`Invalid arguments: senderId (${senderId}) is same as receiverId (${receiverId}).`);
    throw new HttpsError('invalid-argument', '自分自身に送金することはできません。');
  }

  try {
    logger.info("Attempting to create Stripe Payment Intent.");
    const paymentIntent = await stripeClientInstance.paymentIntents.create({
      amount: amount * 100,
      currency: 'jpy',
      payment_method_types: ['card'],
      description: `Payment from ${senderName} to ${receiverName}`,
      metadata: {
        sender_id: senderId,
        receiver_id: receiverId,
        app_id: appId,
        items: items ? JSON.stringify(items) : null,
      },
    });
    logger.info("Stripe Payment Intent created successfully:", { paymentIntentId: paymentIntent.id });
  } catch (error) {
    logger.error("Stripe payment intent creation failed:", error);
    throw new HttpsError("internal", "Stripe payment failed.", { details: error.message });
  }

  const senderProfileRef = db.doc(`artifacts/${appId}/users/${senderId}/profile/userProfile`);
  const receiverProfileRef = db.doc(`artifacts/${appId}/users/${receiverId}/profile/userProfile`);

  const senderTransactionsColRef = db.collection(`artifacts/${appId}/users/${senderId}/transactions`);
  const receiverTransactionsColRef = db.collection(`artifacts/${appId}/users/${receiverId}/transactions`);

  const senderNotificationsColRef = db.collection(`artifacts/${appId}/users/${senderId}/notifications`);
  const receiverNotificationsColRef = db.collection(`artifacts/${appId}/users/${receiverId}/notifications`);

  try {
    logger.info("Starting Firestore transaction.");
    await runTransaction(db, async (transaction) => {
      const senderDoc = await transaction.get(senderProfileRef);
      if (!senderDoc.exists) {
        throw new HttpsError('not-found', '送金元ユーザーのプロフィールが見つかりません。');
      }

      const senderData = senderDoc.data();
      const currentSenderBalance = senderData.balance || 0;
      const currentSenderPoints = senderData.points || 0;
      const actualSenderName = senderData.name || senderName || '不明なユーザー';

      if (currentSenderBalance < amount) {
        throw new HttpsError('failed-precondition', '残高が不足しています。');
      }

      const receiverDoc = await transaction.get(receiverProfileRef);
      if (!receiverDoc.exists) {
        throw new HttpsError('not-found', '受取人ユーザーのプロフィールが見つかりません。');
      }

      const receiverData = receiverDoc.data();
      const currentReceiverBalance = receiverData.balance || 0;
      const actualReceiverName = receiverData.name || receiverName || '不明なユーザー';

      const newSenderBalance = currentSenderBalance - amount;
      const newSenderPoints = currentSenderPoints + Math.floor(amount * 0.03);
      transaction.update(senderProfileRef, {
        balance: newSenderBalance,
        points: newSenderPoints,
      });

      const newReceiverBalance = currentReceiverBalance + amount;
      transaction.update(receiverProfileRef, {
        balance: newReceiverBalance,
      });

      transaction.set(senderTransactionsColRef.doc(), {
        store: actualReceiverName,
        amount: -amount,
        date: FieldValue.serverTimestamp(),
        type: 'payment',
        notification_type: 'info',
        timestamp: FieldValue.serverTimestamp(),
        receiverId: receiverId,
        items: items || null,
      });

      transaction.set(receiverTransactionsColRef.doc(), {
        store: actualSenderName,
        amount: amount,
        date: FieldValue.serverTimestamp(),
        type: 'receive',
        notification_type: 'info',
        timestamp: FieldValue.serverTimestamp(),
        senderId: senderId,
        items: items || null,
      });

      transaction.set(senderNotificationsColRef.doc(), {
        text: `¥${amount.toLocaleString()}を${actualReceiverName}に支払いました。現在の残高：¥${newSenderBalance.toLocaleString()}`,
        read: false,
        type: 'info',
        timestamp: FieldValue.serverTimestamp(),
      });
      
      transaction.set(receiverNotificationsColRef.doc(), {
        text: `¥${amount.toLocaleString()}を${actualSenderName}から受け取りました。現在の残高：¥${newReceiverBalance.toLocaleString()}`,
        read: false,
        type: 'info',
        timestamp: FieldValue.serverTimestamp(),
      });

      logger.info("Firestore transaction for payment completed successfully.", { senderId, receiverId, amount });
    });

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
// Force redeploy - [今日の日付7/18-15:54]
