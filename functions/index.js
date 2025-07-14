// functions/index.js

const admin = require('firebase-admin');

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { getFirestore } = require('firebase-admin/firestore');


admin.initializeApp();

const db = getFirestore();

setGlobalOptions({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
});


exports.processPayment = onCall(async (request) => {
    console.log('Cloud Function: processPayment called.');
    console.log('Cloud Function: request.data:', request.data);
    console.log('Cloud Function: request.auth:', request.auth);
    if (request.auth) {
        console.log('Cloud Function: request.auth.uid:', request.auth.uid);
    } else {
        console.warn('Cloud Function: request.auth is NULL. User is not authenticated.');
    }

    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            '認証されていません。ログインしてください。'
        );
    }

    const senderId = request.auth.uid;
    const { receiverId, amount, senderName, receiverName } = request.data;

    if (!receiverId || typeof amount !== 'number' || amount <= 0) {
        throw new HttpsError(
            'invalid-argument',
            '無効な受取人IDまたは送金額です。'
        );
    }

    if (senderId === receiverId) {
        throw new HttpsError(
            'invalid-argument',
            '自分自身に送金することはできません。'
        );
    }

    const appId = 're-mat-mvp'; // ★あなたのFirebaseプロジェクトIDに置き換えてください★

    const senderProfileRef = db.doc(`artifacts/${appId}/users/${senderId}/profile/userProfile`);
    const receiverProfileRef = db.doc(`artifacts/${appId}/users/${receiverId}/profile/userProfile`);

    // ★ここから修正: 取引履歴と通知のコレクション参照パスを変更★
    const senderTransactionsColRef = db.collection(`artifacts/${appId}/users/${senderId}/transactions`);
    const receiverTransactionsColRef = db.collection(`artifacts/${appId}/users/${receiverId}/transactions`);
    const senderNotificationsColRef = db.collection(`artifacts/${appId}/users/${senderId}/notifications`);
    const receiverNotificationsColRef = db.collection(`artifacts/${appId}/users/${receiverId}/notifications`);
    // ★ここまで修正★

    try {
        await db.runTransaction(async (transaction) => {
            const senderDoc = await transaction.get(senderProfileRef);
            if (!senderDoc.exists) {
                throw new HttpsError(
                    'not-found',
                    '送金元ユーザーのプロフィールが見つかりません。'
                );
            }

            const senderData = senderDoc.data();
            const currentSenderBalance = senderData.balance || 0;
            const currentSenderPoints = senderData.points || 0;
            const actualSenderName = senderData.name || senderName || '不明なユーザー';

            if (currentSenderBalance < amount) {
                throw new HttpsError(
                    'failed-precondition',
                    '残高が不足しています。'
                );
            }

            const receiverDoc = await transaction.get(receiverProfileRef);
            if (!receiverDoc.exists) {
                throw new HttpsError(
                    'not-found',
                    '受取人ユーザーのプロフィールが見つかりません。'
                );
            }

            const receiverData = receiverDoc.data();
            const currentReceiverBalance = receiverData.balance || 0;
            const currentReceiverPoints = receiverData.points || 0;
            const actualReceiverName = receiverData.name || receiverName || '不明なユーザー';


            // 1. 送金元の残高とポイントを更新
            const newSenderBalance = currentSenderBalance - amount;
            const newSenderPoints = currentSenderPoints + Math.floor(amount * 0.03);
            transaction.update(senderProfileRef, {
                balance: newSenderBalance,
                points: newSenderPoints
            });

            // 2. 受取人の残高とポイントを更新
            const newReceiverBalance = currentReceiverBalance + amount;
            const newReceiverPoints = currentReceiverPoints + Math.floor(amount * 0.005);
            transaction.update(receiverProfileRef, {
                balance: newReceiverBalance,
                points: newReceiverPoints
            });

            // 3. 送金元の取引履歴を追加
            transaction.set(senderTransactionsColRef.doc(), { // ★修正後の参照を使用★
                store: actualReceiverName,
                amount: -amount,
                date: admin.firestore.FieldValue.serverTimestamp(),
                type: 'payment',
                notification_type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                receiverId: receiverId
            });

            // 4. 受取人の取引履歴を追加
            transaction.set(receiverTransactionsColRef.doc(), { // ★修正後の参照を使用★
                store: actualSenderName,
                amount: amount,
                date: admin.firestore.FieldValue.serverTimestamp(),
                type: 'receive',
                notification_type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                senderId: senderId
            });

            // 5. 送金元への通知を追加
            transaction.set(senderNotificationsColRef.doc(), { // ★修正後の参照を使用★
                text: `¥${amount.toLocaleString()}を${actualReceiverName}に支払いました。現在の残高：¥${newSenderBalance.toLocaleString()}`,
                read: false,
                type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // 6. 受取人への通知を追加
            transaction.set(receiverNotificationsColRef.doc(), { // ★修正後の参照を使用★
                text: `¥${amount.toLocaleString()}を${actualSenderName}から受け取りました。現在の残高：¥${newReceiverBalance.toLocaleString()}`,
                read: false,
                type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true, message: '送金が完了しました。' };

    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Payment transaction failed:", error);
        throw new HttpsError(
            'internal',
            '送金処理中に予期せぬエラーが発生しました。',
            error.message
        );
    }
});
