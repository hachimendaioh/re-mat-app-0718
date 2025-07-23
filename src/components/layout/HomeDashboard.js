import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner'; // ★修正: パスを '../common/LoadingSpinner' に変更 ★

// 各アイコン画像のインポートを削除。publicフォルダからの直接参照に切り替えます。


const HomeDashboard = ({
  auth,
  isStoreMode,
  userId,
  userName,
  balance,
  points,
  setScreen,
  isLoading // App.jsからのローディング状態
}) => {
  const currentUser = auth?.currentUser;
  const isAnonymous = currentUser?.isAnonymous;

  // ローディング中は何も表示しないか、シンプルなローディング表示
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-white">
        <LoadingSpinner />
        <p className="mt-4">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start p-4 text-white animate-fade-in">
      {/* ユーザーの状態に応じたメッセージ */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md mb-6 text-center animate-fade-in-up">
        {isAnonymous ? (
          <>
            <p className="text-xl font-bold text-yellow-300 mb-3">ようこそ、ゲストユーザー様！</p>
            <p className="text-sm text-gray-300 mb-4">
              アカウントを登録すると、残高やポイントを保存し、<br />
              全ての機能をご利用いただけます。
            </p>
            <button
              onClick={() => setScreen('guest_intro')}
              className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95"
            >
              アカウント登録 / ログイン
            </button>
          </>
        ) : (
          <>
            <p className="text-xl font-bold mb-2">
              {userName ? `${userName}様、おかえりなさい！` : 'ようこそ！'}
            </p>
            <p className="text-sm text-gray-300">
              今日もRE-Matをご利用いただきありがとうございます。
            </p>
          </>
        )}
      </div>

      {/* 残高とポイントの表示 */}
      <div className="bg-gradient-to-br from-blue-700 to-purple-800 p-6 rounded-xl shadow-lg w-full max-w-md mb-6 animate-fade-in-up delay-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">残高</span>
          <span className="text-3xl font-bold">¥{balance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">ポイント</span>
          <span className="text-3xl font-bold">{points.toLocaleString()}pt</span>
        </div>
      </div>

      {/* 店舗モードの状態表示 */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md mb-6 text-center animate-fade-in-up delay-200">
        {isStoreMode ? (
          <>
            <p className="text-lg font-bold mb-2">店舗モード: ✅ 有効</p>
            <p className="text-sm text-gray-300">
              QRコードで支払いを受け取ることができます。
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-300">
            店舗として支払いを受け取るには、<br />
            アカウント画面で店舗モードを有効にしてください。
          </p>
        )}
        <button
          onClick={() => setScreen('account')}
          className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-full text-md font-semibold shadow-md hover:bg-purple-700 transition-all duration-300 transform active:scale-95"
        >
          アカウント設定へ
        </button>
      </div>

      {/* よく使う機能へのショートカットボタン */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-md animate-fade-in-up delay-300">
        <button
          onClick={() => setScreen('スキャン')}
          className="flex flex-col items-center justify-center bg-green-600 text-white py-4 px-2 rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/scan.png" alt="スキャン" className="w-7 h-7 mb-1" />
          スキャン
        </button>
        <button
          onClick={() => setScreen('チャージ')}
          className="flex flex-col items-center justify-center bg-blue-600 text-white py-4 px-2 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/charge.png" alt="チャージ" className="w-7 h-7 mb-1" />
          チャージ
        </button>
        <button
          onClick={() => setScreen('受け取る')}
          className="flex flex-col items-center justify-center bg-indigo-600 text-white py-4 px-2 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/receive.png" alt="受け取る" className="w-7 h-7 mb-1" />
          受け取る
        </button>
        <button
          onClick={() => setScreen('取引履歴')}
          className="flex flex-col items-center justify-center bg-gray-600 text-white py-4 px-2 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-700 transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/history.png" alt="取引履歴" className="w-7 h-7 mb-1" />
          取引履歴
        </button>
      </div>
    </div>
  );
};

export default HomeDashboard;
