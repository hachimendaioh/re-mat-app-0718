// src/components/layout/NavigationBar.js

import React from 'react';

/**
 * アプリケーションのフッターナビゲーションバーコンポーネント。
 * @param {object} props - コンポーネントのプロパティ
 * @param {(screenName: string) => void} props.setScreen - 画面遷移関数
 * @param {object|null} props.auth - Firebase Authインスタンス
 * @param {number} props.unreadNotificationsCount - 未読通知の数
 * @param {string} props.currentScreen - 現在表示されている画面の名前
 */
const NavigationBar = ({ setScreen, auth, unreadNotificationsCount, currentScreen }) => {
  const displayUnreadCount = typeof unreadNotificationsCount === 'number' ? unreadNotificationsCount : 0;
  const isAnonymous = auth?.currentUser?.isAnonymous;

  // ナビゲーションバーの各ボタンのデータ
  // アイコンは既存のpublic/iconsフォルダ内の画像を使用
  const navItems = [
    { name: 'home', label: 'Home', iconSrc: '/icons/home.png' },
    { name: 'notifications', label: '通知', iconSrc: '/icons/info.png', disabled: isAnonymous },
    { name: 'wallet', label: 'Wallet', iconSrc: '/icons/wallet.png', disabled: isAnonymous },
    { name: 'account', label: isAnonymous ? 'ゲスト' : 'アカウント', iconSrc: '/icons/account.png' },
  ];

  return (
    // 背景色と影をSWC風に調整、z-indexを高く
    <div className="fixed bottom-0 left-0 w-full bg-gradient-to-br from-[#1A032E] to-[#3A0F5B] text-white py-2 shadow-xl z-20">
      <nav className="flex justify-around items-center h-full">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setScreen(item.name)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 active:scale-90 transform
              ${currentScreen === item.name ? 'text-purple-300' : 'text-gray-400'}
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2A0847]'}`}
            disabled={item.disabled}
          >
            <div className="relative">
              <img src={item.iconSrc} alt={item.label} className="w-7 h-7 mb-1" />
              {item.name === 'notifications' && displayUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF007F] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold border border-[#1A032E]">
                  {displayUnreadCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default NavigationBar;
