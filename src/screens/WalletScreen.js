// src/screens/WalletScreen.js

import React from 'react';

// アイコン画像をインポート (パスはプロジェクトの構造に合わせて調整してください)
// ここでは /icons/ ディレクトリにあると仮定します。
const chargeIcon = '/icons/charge.png'; // charge.pngのパス
const pointsIcon = '/icons/points.png'; // points.pngのパス

const WalletScreen = ({ balance, points, setScreen, setModal }) => { // setModalをプロップとして受け取る
  return (
    <div className="p-4 text-white text-center animate-fade-in font-inter flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <h2 className="text-3xl font-bold mb-8">マイウォレット</h2>

      {/* 残高とポイントの概要カード */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm mb-6 animate-slide-in-right">
        <div className="mb-4">
          <p className="text-gray-300 text-lg mb-1">現在の残高</p>
          <p className="text-green-400 text-5xl font-extrabold">
            ¥{balance.toLocaleString()}
          </p>
        </div>
        <div className="border-t border-gray-700 pt-4">
          <p className="text-gray-300 text-lg mb-1">使えるポイント</p>
          <p className="text-blue-400 text-3xl font-bold">
            {points.toLocaleString()} pt
          </p>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <button
          onClick={() => setScreen('チャージ')} // チャージ画面へ遷移
          className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg font-bold shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
        >
          {/* ★修正: charge.png アイコンを使用★ */}
          <img src={chargeIcon} alt="チャージ" className="w-8 h-8" />
          <span>チャージする</span>
        </button>
        <button
          onClick={() => {
            // ポイント交換機能は未実装のため、デモモーダルを表示
            if (typeof setModal === 'function') {
              setModal({
                isOpen: true,
                title: '機能開発中',
                message: 'ポイント交換機能は現在開発中です。もうしばらくお待ちください。',
                onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
                showCancelButton: false,
              });
            } else {
              console.warn("setModal function is not available in WalletScreen.");
              alert("ポイント交換機能は現在開発中です。"); // setModalがない場合のフォールバック
            }
          }}
          className="bg-purple-500 text-white px-6 py-3 rounded-full text-lg font-bold shadow-md hover:bg-purple-600 transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
        >
          {/* ★修正: points.png アイコンを使用★ */}
          <img src={pointsIcon} alt="ポイント交換" className="w-8 h-8" />
          <span>ポイント交換</span>
        </button>
      </div>

      <button
        onClick={() => setScreen('home')}
        className="mt-8 bg-gray-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
      >
        ホームに戻る
      </button>
    </div>
  );
};

export default WalletScreen;
