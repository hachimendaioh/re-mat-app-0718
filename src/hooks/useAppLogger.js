// src/hooks/useAppLogger.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { logToFirestore } from '../utils/logToFirestore'; // logToFirestoreをインポート

// Firestoreへの書き込み頻度を制限するためのデバウンス関数
const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

/**
 * アプリケーションのコンソールログをオーバーライドし、
 * 画面表示とFirestoreへのログ送信を管理するカスタムフック。
 * @param {boolean} isFirebaseReady - Firebaseの初期化が完了したか
 * @param {string} appId - アプリケーションID
 * @param {string} currentScreen - 現在表示されている画面名
 * @param {object} auth - Firebase Authインスタンス
 * @param {string|null} userId - 現在のユーザーID
 * @returns {Array<string>} onScreenLogs - 画面に表示するログメッセージの配列
 */
export const useAppLogger = (isFirebaseReady, appId, currentScreen, auth, userId) => {
  const [onScreenLogs, setOnScreenLogs] = useState([]); // 画面表示用ログステート
  const originalConsoleLog = useRef(console.log);
  const originalConsoleWarn = useRef(console.warn);
  const originalConsoleError = useRef(console.error);

  // logToFirestore のデバウンスされたバージョンを作成 (500ms ごとにまとめて送信)
  const debouncedLogToFirestore = useCallback(debounce(logToFirestore, 500), []);

  useEffect(() => {
    // グローバル変数に現在の画面と認証情報を設定（logToFirestoreからアクセスするため）
    // これはReactの原則から外れるが、デバッグ目的で許容
    window.currentAppScreen = currentScreen; 
    window.firebaseAuth = auth; 

    // console.logをオーバーライド
    console.log = (...args) => {
      originalConsoleLog.current(...args); // 元のコンソールにも出力
      // 'log'レベルのメッセージは画面表示用ログには追加しない
      // Firestoreへの送信もlogToFirestore側でフィルタリングされるため、ここでは呼び出し続ける
      if (isFirebaseReady && appId && userId) { 
        debouncedLogToFirestore(appId, 'log', ...args); 
      }
    };

    // console.warnをオーバーライド
    console.warn = (...args) => {
      originalConsoleWarn.current(...args);
      // 'warn'レベルのメッセージは画面表示用ログには追加しない
      if (isFirebaseReady && appId && userId) {
        debouncedLogToFirestore(appId, 'warn', ...args);
      }
    };

    // console.errorをオーバーライド
    console.error = (...args) => {
      originalConsoleError.current(...args);
      setOnScreenLogs(prevLogs => {
        const newLog = 'ERROR: ' + args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            try { return JSON.stringify(arg); } catch (e) { return String(e); }
          }
          return String(arg);
        }).join(' ');
        return [...prevLogs, newLog].slice(-20); // 最新20件を保持
      });
      if (isFirebaseReady && appId && userId) {
        debouncedLogToFirestore(appId, 'error', ...args);
      }
    };

    // クリーンアップ関数で元のconsole関数に戻す
    return () => {
      console.log = originalConsoleLog.current;
      console.warn = originalConsoleWarn.current;
      console.error = originalConsoleError.current;
    };
  }, [isFirebaseReady, appId, currentScreen, auth, userId, debouncedLogToFirestore]);

  return onScreenLogs;
};
