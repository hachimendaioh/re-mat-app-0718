// src/components/layout/NavigationBar.js

import React from 'react';
import { homeIcon, infoIcon, walletIcon, accounticon } from '../../constants/icons'; // アイコンをインポート

/**
 * アプリケーションのフッターナビゲーションバーコンポーネント。
 * @param {object} props - コンポーネントのプロパティ
 * @param {(screenName: string) => void} props.setScreen - 画面遷移関数
 * @param {object|null} props.auth - Firebase Authインスタンス
 * @param {number} props.unreadNotificationsCount - 未読通知の数
 */
const NavigationBar = ({ setScreen, auth, unreadNotificationsCount }) => {
  return (
    <div className="bg-[rgb(255,100,0)] p-4 flex justify-around items-center fixed bottom-0 left-0 w-full z-10 shadow-lg">
      <button
        onClick={() => setScreen('home')}
        className={`flex flex-col items-center p-2 rounded-lg hover:bg-orange-600 transition-colors duration-200 active:scale-90 transform`}
      >
        <img src={homeIcon} alt="Home" className="w-7 h-7 mb-1" />
        <span className="text-white text-xs font-bold">HOME</span>
      </button>
      <button
        onClick={() => setScreen('notifications')}
        className={`flex flex-col items-center p-2 rounded-lg hover:bg-orange-600 transition-colors duration-200 active:scale-90 transform relative
          ${auth?.currentUser?.isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <img src={infoIcon} alt="Info" className="w-7 h-7 mb-1" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
            {unreadNotificationsCount}
          </span>
        )}
        <span className="text-white text-xs font-bold">info</span>
      </button>
      <button
        onClick={() => setScreen('チャージ')}
        className={`flex flex-col items-center p-2 rounded-lg hover:bg-orange-600 transition-colors duration-200 active:scale-90 transform
          ${auth?.currentUser?.isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <img src={walletIcon} alt="Wallet" className="w-7 h-7 mb-1" />
        <span className="text-white text-xs font-bold">Wallet</span>
      </button>
      <button
        onClick={() => setScreen('account')}
        className={`flex flex-col items-center p-2 rounded-lg hover:bg-orange-600 transition-colors duration-200 active:scale-90 transform`}
      >
        <img src={accounticon} alt="Account" className="w-7 h-7 mb-1" />
        <span className="text-white text-xs font-bold">アカウント</span>
      </button>
    </div>
  );
};

export default NavigationBar;
