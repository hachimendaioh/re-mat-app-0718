// src/components/layout/HomeDashboard.js

import React, { useState } from 'react';
// import AdSenseAd from '../common/AdSenseAd'; // ★この行を削除します★
import { scanIcon, chargeIcon, pointsIcon, historyIcon, walletIcon, payIcon } from '../../constants/icons'; // アイコンをインポート

/**
 * ホーム画面の主要なダッシュボードコンテンツを表示するコンポーネント。
 * @param {object} props - コンポーネントのプロパティ
 * @param {object|null} props.auth - Firebase Authインスタンス
 * @param {boolean} props.isStoreMode - 店舗モードかどうか
 * @param {string|null} props.userId - 現在のユーザーID
 * @param {string} props.userName - 現在のユーザー名
 * @param {number} props.balance - 現在の残高
 * @param {number} props.points - 現在のポイント
 * @param {(screenName: string) => void} props.setScreen - 画面遷移関数
 * @param {boolean} props.isLoading - アプリがロード中かどうか
 */
const HomeDashboard = ({ auth, isStoreMode, userId, userName, balance, points, setScreen, isLoading }) => {
  // const [isAdLoaded, setIsAdLoaded] = useState(false); // ★この行も不要になりますので削除します★

  return (
    <>
      {/* Top Ad Space */}
      <div className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-md relative overflow-hidden rounded-xl mb-6">
        <div className="absolute inset-0 bg-pattern-dots opacity-20"></div>
        <span className="relative z-10">お得なキャンペーン実施中！今すぐチェック！</span>
        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs px-2 py-1 rounded-full bg-black bg-opacity=30 hover:bg-opacity-50 transition-colors">
          閉じる
        </button>
      </div>

      {/* AdSense広告の表示 (AdSenseAdコンポーネントを使用) はApp.jsに移動しました。
          ここでは関連するコードを削除します。
      {!isLoading && (
        <div className={`w-full text-center my-6 ${isAdLoaded ? '' : 'h-0 overflow-hidden'}`}>
          <AdSenseAd
            slot="YOUR_AD_UNIT_SLOT_ID"
            style={{ display: 'block', height: '100px', width: '320px', margin: 'auto' }}
            onAdLoad={() => setIsAdLoaded(true)}
          />
        </div>
      )}
      */}

      {/* Store/User Dashboard */}
      <div className="mx-4 bg-white rounded-xl shadow-lg p-5 my-6 text-left text-black animate-slide-in-right">
        <h3 className="text-xl font-bold mb-4 text-gray-800">
          {auth?.currentUser?.isAnonymous ? 'ゲストユーザー' : (isStoreMode ? '店舗ダッシュボード' : 'ユーザーダッシュボード')}
        </h3>
        {/* ゲストユーザーの場合はユーザーIDを表示しない */}
        {!auth?.currentUser?.isAnonymous && userId && (
          <div className="flex justify-between mb-2 text-base">
            <span className="text-gray-600">ユーザーID</span>
            <span className="font-semibold text-blue-600 break-all">{userId}</span> {/* Display userId */}
          </div>
        )}
        {auth?.currentUser?.isAnonymous ? (
          <p className="text-sm text-gray-500">
            <button
              onClick={() => setScreen('guest_intro')}
              className="text-blue-500 hover:text-blue-400 font-semibold underline"
            >
              アカウント登録/ログイン
            </button>
            {' '}すると、残高やポイントを保存できます。
          </p>
        ) : (
          isStoreMode ? (
            <>
              <div className="flex justify-between mb-2 text-base">
                <span className="text-gray-600">店舗名</span>
                <span className="font-semibold">ReMat店舗</span>
              </div>
              <div className="flex justify-between mb-2 text-base">
                <span className="text-gray-600">店舗ID</span>
                <span className="font-semibold">STORE001</span>
              </div>
              <div className="flex justify-between mb-2 text-base">
                <span className="text-gray-600">本日売上</span>
                <span className="font-semibold text-green-600">5,000円</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between mb-2 text-base">
                <span className="text-gray-600">ユーザー名</span>
                <span className="font-semibold">{userName || '未設定'}</span>
              </div>
            </>
          )
        )}
      </div>

      {/* Other Home Screen Elements */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 mb-6">
        {/* 視覚的機能制限の適用 */}
        {[
          { label: 'スキャン', action: 'スキャン', icon: scanIcon, restricted: true },
          { label: 'チャージ', action: 'チャージ', icon: chargeIcon, restricted: true },
          { label: 'ポイント', action: 'ポイント', icon: pointsIcon, restricted: false }, // ポイントはゲストでも見れる想定
          { label: '取引履歴', action: '取引履歴', icon: historyIcon, restricted: true },
          { label: '受け取る', action: '受け取る', icon: walletIcon, restricted: true }, // 受け取るボタン
        ].map((button, index) => (
          <button
            key={index}
            onClick={() => setScreen(button.action)}
            // 匿名ユーザーでrestrictedな機能の場合にopacityとcursor-not-allowedを追加
            className={`bg-[rgb(255,100,0)] text-white p-4 rounded-xl flex flex-col items-center justify-center shadow-md hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 active:scale-95
              ${auth?.currentUser?.isAnonymous && button.restricted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <img src={button.icon} alt={button.label} className="w-10 h-10 mb-2" />
            <span className="text-white text-sm font-bold">{button.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-4 bg-white rounded-xl shadow-lg p-5 mb-6 text-left text-black animate-slide-in-left">
        <div className="flex justify-between items-center mb-3 text-lg font-medium">
          <span className="text-gray-600">残高</span>
          <span className="font-bold text-blue-600">{balance.toLocaleString()} 円</span>
        </div>
        <hr className="border-gray-300" />
        <div className="flex justify-between items-center mt-3 text-lg font-medium">
          <span className="text-gray-600">使えるポイント</span>
          <span className="font-bold text-green-600">{points}pt</span>
        </div>
      </div>

      <div className="mb-6 flex justify-center">
        <button
          onClick={() => setScreen('支払い')}
          // 匿名ユーザーで支払いがrestrictedな機能の場合にopacityとcursor-not-allowedを追加
          className={`bg-red-600 text-white w-24 h-24 rounded-full text-sm flex flex-col justify-center items-center shadow-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-110 active:scale-95
                ${auth?.currentUser?.isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`} // 支払いは常にrestricted
        >
          <img src={payIcon} alt="支払い" className="w-8 h-8 mb-1" />
          <span className="font-bold">支払い</span>
        </button>
      </div>
    </>
  );
};

export default HomeDashboard;
