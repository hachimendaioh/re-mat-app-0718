// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin SDKを初期化
// Cloud Functions環境では、サービスアカウントキーを明示的に指定する必要はありません。
// 環境変数から自動的に認証情報がロードされます。
admin.initializeApp();

const db = admin.firestore();

/**
 * 送金処理を行うCallable Cloud Function。
 * ユーザーAからユーザーBへ安全に金額を送金し、残高、ポイント、取引履歴、通知を更新します。
 *
 * @param {object} data - クライアントから送信されるデータ
 * @param {string} data.senderId - 送金元ユーザーのUID
 * @param {string} data.receiverId - 受取人ユーザーのUID
 * @param {number} data.amount - 送金する金額
 * @param {string} [data.senderName] - 送金元ユーザーの名前 (通知用、オプション)
 * @param {string} [data.receiverName] - 受取人ユーザーの名前 (通知用、オプション)
 * @param {object} context - 認証情報を含むコンテキスト
 * @returns {object} 処理結果を示すオブジェクト
 */
exports.processPayment = functions.https.onCall(async (data, context) => {
    // 1. 認証チェック
    // 呼び出し元が認証されていることを確認
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            '認証されていません。ログインしてください。'
        );
    }

    const senderId = context.auth.uid; // 呼び出し元のUIDを送金元とする
    const { receiverId, amount, senderName, receiverName } = data;

    // 2. 入力値のバリデーション
    if (!receiverId || typeof amount !== 'number' || amount <= 0) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            '無効な受取人IDまたは送金額です。'
        );
    }

    // 送金元と受取人が同じでないことを確認
    if (senderId === receiverId) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            '自分自身に送金することはできません。'
        );
    }

    // FirestoreのApp IDを取得 (Reactアプリと同じIDを使用)
    // ここではハードコードしていますが、環境変数として設定することも可能です
    const appId = 're-mat-mvp'; // ★re-mat-mvpあなたのFirebaseプロジェクトIDに置き換えてください★

    const senderProfileRef = db.doc(`artifacts/${appId}/users/${senderId}/profile/userProfile`);
    const receiverProfileRef = db.doc(`artifacts/${appId}/users/${receiverId}/profile/userProfile`);

    // トランザクションを開始
    try {
        await db.runTransaction(async (transaction) => {
            // 送金元のプロフィールを取得
            const senderDoc = await transaction.get(senderProfileRef);
            if (!senderDoc.exists) {
                throw new functions.https.HttpsError(
                    'not-found',
                    '送金元ユーザーのプロフィールが見つかりません。'
                );
            }

            const senderData = senderDoc.data();
            const currentSenderBalance = senderData.balance || 0;
            const currentSenderPoints = senderData.points || 0;
            const actualSenderName = senderData.name || senderName || '不明なユーザー';

            // 残高チェック
            if (currentSenderBalance < amount) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    '残高が不足しています。'
                );
            }

            // 受取人のプロフィールを取得
            const receiverDoc = await transaction.get(receiverProfileRef);
            if (!receiverDoc.exists) {
                throw new functions.https.HttpsError(
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
            const newSenderPoints = currentSenderPoints + Math.floor(amount * 0.03); // 送金元には3%ポイント付与
            transaction.update(senderProfileRef, {
                balance: newSenderBalance,
                points: newSenderPoints
            });

            // 2. 受取人の残高とポイントを更新
            const newReceiverBalance = currentReceiverBalance + amount;
            const newReceiverPoints = currentReceiverPoints + Math.floor(amount * 0.005); // 受取人には0.5%ポイント付与
            transaction.update(receiverProfileRef, {
                balance: newReceiverBalance,
                points: newReceiverPoints
            });

            // 3. 送金元の取引履歴を追加
            const senderTransactionsColRef = senderProfileRef.collection('transactions');
            transaction.set(senderTransactionsColRef.doc(), {
                store: actualReceiverName, // 受取人名
                amount: -amount, // 支払いなのでマイナス
                date: admin.firestore.FieldValue.serverTimestamp(),
                type: 'payment',
                notification_type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                receiverId: receiverId // 受取人IDも記録
            });

            // 4. 受取人の取引履歴を追加
            const receiverTransactionsColRef = receiverProfileRef.collection('transactions');
            transaction.set(receiverTransactionsColRef.doc(), {
                store: actualSenderName, // 送金元ユーザーの名前
                amount: amount, // 受取なのでプラス
                date: admin.firestore.FieldValue.serverTimestamp(),
                type: 'receive',
                notification_type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                senderId: senderId // 送金元IDも記録
            });

            // 5. 送金元への通知を追加
            const senderNotificationsColRef = senderProfileRef.collection('notifications');
            transaction.set(senderNotificationsColRef.doc(), {
                text: `¥${amount.toLocaleString()}を${actualReceiverName}に支払いました。現在の残高：¥${newSenderBalance.toLocaleString()}`,
                read: false,
                type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // 6. 受取人への通知を追加
            const receiverNotificationsColRef = receiverProfileRef.collection('notifications');
            transaction.set(receiverNotificationsColRef.doc(), {
                text: `¥${amount.toLocaleString()}を${actualSenderName}から受け取りました。現在の残高：¥${newReceiverBalance.toLocaleString()}`,
                read: false,
                type: 'info',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true, message: '送金が完了しました。' };

    } catch (error) {
        // HttpsErrorはそのままスロー
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // その他のエラーはInternalエラーとしてスロー
        console.error("Payment transaction failed:", error);
        throw new functions.https.HttpsError(
            'internal',
            '送金処理中に予期せぬエラーが発生しました。',
            error.message
        );
    }
});