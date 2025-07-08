// src/utils/logToFirestore.js

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb, firebaseAuth } from '../firebase/firebaseConfig'; // Firebaseインスタンスをインポート

/**
 * Firestoreにログを書き込む関数。
 * @param {string} appId - アプリケーションID
 * @param {string} level - ログレベル (e.g., 'log', 'warn', 'error')
 * @param {...any} args - ログメッセージの引数
 */
export const logToFirestore = async (appId, level, ...args) => {
  const db = firebaseDb; // firebaseConfigからdbインスタンスを取得
  const auth = firebaseAuth; // firebaseConfigからauthインスタンスを取得

  if (!db || !appId) {
    console.warn("logToFirestore: Firestore instance or appId not available. Log not sent to Firestore.");
    return;
  }

  // ログメッセージを整形
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg); // JSON.stringifyが失敗した場合
      }
    }
    return String(arg);
  }).join(' ');

  const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
  const userEmail = auth.currentUser ? auth.currentUser.email : null;
  const currentScreen = window.currentAppScreen || 'unknown'; // useAppLoggerで設定されたグローバル変数

  try {
    const logsCollectionRef = collection(db, `artifacts/${appId}/dev_logs`);
    await addDoc(logsCollectionRef, {
      level,
      message,
      timestamp: serverTimestamp(),
      userId,
      userEmail,
      screen: currentScreen,
      // 必要に応じて、その他のコンテキスト情報も追加
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
    // console.log(`logToFirestore: Logged '${level}' to Firestore: ${message}`); // ログの無限ループを防ぐためコメントアウト
  } catch (error) {
    console.error("logToFirestore: Firestoreへのログ送信失敗:", error);
    // ここで無限ループを防ぐため、元のコンソールエラーは使わない
    // originalConsoleError.current("logToFirestore: Firestoreへのログ送信失敗:", error);
  }
};
