// src/utils/logToFirestore.js

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '../firebase/firebaseConfig'; // 初期化済みのFirestoreインスタンスをインポート

const db = firebaseDb; // Firestoreインスタンスを取得

/**
 * Firebase Firestoreにログを送信する関数。
 * このバージョンでは、'error'レベルのログのみを送信します。
 * @param {string} appId - アプリケーションID
 * @param {string} level - ログレベル ('log', 'warn', 'error')
 * @param {...any} args - コンソールログに渡された引数
 */
export const logToFirestore = async (appId, level, ...args) => {
  // 'error'レベルのログのみをFirestoreに送信
  if (level !== 'error') {
    return; // 'error'レベル以外のログは送信しない
  }

  // Firebaseがまだ初期化されていない場合はログを送信しない
  if (!db || !appId) {
    console.warn('logToFirestore: FirebaseまたはappIdが未初期化のためログを送信できません。');
    return;
  }

  try {
    // ログメッセージを整形（オブジェクトも文字列化）
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

    // ログコレクションのパスにappIdを含める
    await addDoc(collection(db, `artifacts/${appId}/dev_logs`), {
      timestamp: serverTimestamp(), // サーバー側の正確なタイムスタンプ
      level: level, // 'log', 'warn', 'error'
      message: message,
      userAgent: navigator.userAgent,
      // 必要に応じて追加情報 (App.jsからグローバル変数として設定)
      userId: window.firebaseAuth?.currentUser?.uid || 'anonymous',
      currentScreen: window.currentAppScreen || 'unknown',
    });
  } catch (e) {
    // Firestoreへのログ送信自体が失敗した場合の警告（無限ループを防ぐため、元のconsole.warnで出力）
    console.warn('Firestoreへのログ送信失敗:', e);
  }
};
