// src/screens/AuthManagementSection.js

import React from 'react';

const AuthManagementSection = ({
  isAnonymousUser,
  setScreen // 画面遷移用
}) => {
  // 認証済みユーザーの場合はこのセクションは表示しない
  if (!isAnonymousUser) {
    return null; 
  }

  // 匿名ユーザーの場合に表示するメッセージとボタン
  return (
    <div className="mb-6 p-4 bg-yellow-600 rounded-xl shadow-lg text-center animate-bounce-in">
      <p className="font-bold text-lg mb-2">💡 ゲストユーザーです</p>
      <p className="text-sm">
        残高やポイントを保存し、全ての機能をご利用いただくには、<br/>
        アカウント登録またはログインが必要です。
      </p>
      <button
        onClick={() => setScreen('register')} // アカウント登録画面へ遷移
        className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full text-md font-semibold hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
      >
        アカウントを登録して連携する
      </button>
    </div>
  );
};

export default AuthManagementSection;
