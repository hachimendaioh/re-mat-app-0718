// src/hooks/useAppLogger.js

import { useState, useEffect, useRef, useCallback } from 'react'; // ★useCallback を追加
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '../firebase/firebaseConfig';

/**
 * アプリケーションのログを管理し、Firestoreに送信するカスタムフック。
 * @param {boolean} isFirebaseReady - Firebaseの初期化が完了したか
 * @param {string} appId - FirebaseプロジェクトのアプリケーションID
 * @param {string} screen - 現在の画面名
 * @param {object|null} auth - Firebase Authインスタンス
 * @param {string|null} userId - 現在のユーザーID
 * @returns {Array<string>} 画面内に表示するエラーログの配列
 */
export const useAppLogger = (isFirebaseReady, appId, screen, auth, userId) => {
  const [onScreenLogs, setOnScreenLogs] = useState([]);
  const currentScreen = useRef(screen); // 最新の画面名を保持するためのref

  // 画面名が変更されたときにrefを更新
  useEffect(() => {
    currentScreen.current = screen;
  }, [screen]);

  // Firestoreにログを送信する関数
  // この関数は、console.error/logのオーバーライドから呼び出される
  const logToFirestore = useCallback(async (logMessage, logType = 'info') => {
    // Firebaseが準備できていない、またはユーザーIDがない場合はログを送信しない
    // （初期化中の大量ログを防ぐため）
    if (!isFirebaseReady || !userId || !firebaseDb || !appId) {
      // console.warn("logToFirestore: Firebase not ready or userId/appId missing. Skipping log.", logMessage);
      return;
    }

    try {
      const logsCollectionRef = collection(firebaseDb, `artifacts/${appId}/dev_logs`);
      
      // addDoc を使用して、自動生成IDで新しいドキュメントを作成
      await addDoc(logsCollectionRef, {
        timestamp: serverTimestamp(),
        userId: userId,
        screen: currentScreen.current, // 現在の画面名をログに含める
        type: logType, // 'info', 'warn', 'error'
        message: logMessage,
        // auth.currentUser の情報も追加するとデバッグに役立つが、個人情報に注意
        // authUid: auth?.currentUser?.uid,
        // authEmail: auth?.currentUser?.email,
      });

    } catch (error) {
      // ここでのエラーはコンソールにのみ出力し、無限ループを防ぐ
      console.error("logToFirestore: Firestoreへのログ送信失敗:", error);
    }
  }, [isFirebaseReady, userId, appId]); // 依存配列に isFirebaseReady, userId, appId を追加

  useEffect(() => {
    // console.log のオーバーライド
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      originalConsoleLog(...args); // 元のコンソールログも実行

      const logString = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return `[Circular or complex object: ${e.message}]`; // 循環参照対策
          }
        }
        return String(arg);
      }).join(' ');

      // 特定のログ（AdSense, QrCodeScanner）はFirestoreに送信しない
      if (!logString.startsWith('AdSenseAd:') && !logString.startsWith('QrCodeScanner:')) {
        logToFirestore(logString, 'info');
      }
    };

    // console.error のオーバーライド
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args); // 元のコンソールエラーも実行

      const errorString = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return `[Circular or complex error object: ${e.message}]`; // 循環参照対策
          }
        }
        return String(arg);
      }).join(' ');
      
      // 画面内ログに追加 (エラーのみ)
      setOnScreenLogs(prevLogs => {
        // 最新の5件のみ保持
        const newLogs = [...prevLogs, `ERROR: ${errorString}`];
        return newLogs.slice(-5);
      });

      logToFirestore(errorString, 'error');
    };

    // クリーンアップ関数
    return () => {
      console.log = originalConsoleLog; // 元に戻す
      console.error = originalConsoleError; // 元に戻す
    };
  }, [logToFirestore]); // logToFirestore を依存配列に追加

  return onScreenLogs;
};
