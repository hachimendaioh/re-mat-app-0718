// src/components/layout/DebugInfo.js

import React from 'react';

/**
 * アプリのデバッグ情報を表示するコンポーネント。
 * @param {object} props - コンポーネントのプロパティ
 * @param {string} props.screen - 現在の画面名
 * @param {string|null} props.userId - 現在のユーザーID
 * @param {object|null} props.auth - Firebase Authインスタンス
 * @param {boolean} props.isFirebaseReady - Firebaseの初期化が完了したか
 * @param {boolean} props.isInitialDataLoaded - 初期データロードが完了したか
 * @param {boolean} props.splashScreenTimerCompleted - スプラッシュスクリーンのタイマーが完了したか
 * @param {string} props.scanMode - スキャンモードの状態
 */
const DebugInfo = ({ screen, userId, auth, isFirebaseReady, isInitialDataLoaded, splashScreenTimerCompleted, scanMode }) => {
  return (
    <div className="mx-4 mb-4 p-3 bg-gray-700 rounded-lg text-white text-sm">
      <p>現在の画面: <span className="font-bold">{screen}</span></p>
      <p>ユーザーID: <span className="font-bold break-all">{userId || '未取得'}</span></p>
      <p>匿名ユーザー判定: <span className="font-bold">{auth?.currentUser?.isAnonymous ? 'はい' : 'いいえ'}</span></p>
      <p>Firebase Ready: <span className="font-bold">{isFirebaseReady ? 'はい' : 'いいえ'}</span></p>
      <p>Initial Data Loaded: <span className="font-bold">{isInitialDataLoaded ? 'はい' : 'いいえ'}</span></p>
      <p>スプラッシュタイマー完了: <span className="font-bold">{splashScreenTimerCompleted ? 'はい' : 'いいえ'}</span></p>
      <p>スキャンモード: <span className="font-bold">{scanMode}</span></p> 
    </div>
  );
};

export default DebugInfo;
