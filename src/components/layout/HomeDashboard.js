import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const HomeDashboard = ({
  auth,
  isStoreMode,
  userId,
  userName,
  balance,
  points,
  setScreen,
  isLoading,
  profileImage
}) => {
  const currentUser = auth?.currentUser;
  const isAnonymous = currentUser?.isAnonymous;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-white">
        <LoadingSpinner />
        <p className="mt-4 text-gray-300">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start p-4 text-white animate-fade-in relative z-0">

      {/* トップヘッダーの調整 */}
      <div className="flex items-center justify-between w-full max-w-md mb-8">
        {/* プロフィール画像またはアバター */}
        <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden shadow-lg animate-fade-in-up">
          {profileImage ? (
            <img src={profileImage} alt="プロフィール" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
            </svg>
          )}
        </div>

        {/* ユーザーの状態に応じたメッセージ */}
        <div className="text-right flex-grow px-4">
          {isAnonymous ? (
            <p className="text-xl font-bold text-yellow-300">ようこそ、ゲストユーザー様！</p>
          ) : (
            <p className="text-xl font-bold">
              {userName ? `${userName}様、おかえりなさい！` : 'ようこそ！'}
            </p>
          )}
          <p className="text-sm text-gray-400">
            今日もRE-Matをご利用いただきありがとうございます。
          </p>
        </div>
        {isAnonymous && (
          <button
            onClick={() => setScreen('guest_intro')}
            className="bg-gradient-to-r from-[#FF007F] to-[#CC00CC] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:from-[#CC00CC] hover:to-[#FF007F] transition-all duration-300 transform active:scale-95"
          >
            ログイン
          </button>
        )}
      </div>

     {/* 残高とポイントの表示（背景をもうほんの少しだけ明るい紫にし、線で囲む） */}
      <div className="bg-[#3B2A65] border border-purple-700 p-6 rounded-2xl shadow-xl w-full max-w-md mb-6 animate-fade-in-up delay-100 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-gray-300">
            <img src="https://placehold.co/24x24/ffffff/000000?text=¥" alt="残高" className="w-6 h-6 mr-2 opacity-80" />
            <span className="text-lg font-semibold">残高</span>
          </div>
          <span className="text-4xl font-extrabold text-white">¥{balance.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center text-gray-300">
            <img src="/icons/points.png" alt="ポイント" className="w-6 h-6 mr-2 opacity-80" />
            <span className="text-lg font-semibold">ポイント</span>
          </div>
          <span className="text-3xl font-bold text-white">{points.toLocaleString()}pt</span>
        </div>
        <div className="mt-4 text-center text-xs text-gray-400">
          <button onClick={() => setScreen('取引履歴')} className="underline hover:text-gray-200 transition-colors duration-200">
            今月の利用履歴をチェック &gt;
          </button>
        </div>
      </div>

      {/* よく使う機能へのショートカットボタン (SWCアプリのボタン風) */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-md mb-6 animate-fade-in-up delay-200">
        <button
          onClick={() => setScreen('スキャン')}
          className="flex flex-col items-center justify-center bg-[#2C204B] text-white py-4 px-2 rounded-2xl font-bold text-sm shadow-xl hover:bg-[#3B2A65] transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/scan.png" alt="スキャン" className="w-8 h-8 mb-2" />
          スキャン
        </button>
        <button
          onClick={() => setScreen('チャージ')}
          className="flex flex-col items-center justify-center bg-[#2C204B] text-white py-4 px-2 rounded-2xl font-bold text-sm shadow-xl hover:bg-[#3B2A65] transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/charge.png" alt="チャージ" className="w-8 h-8 mb-2" />
          チャージ
        </button>
        <button
          onClick={() => setScreen('受け取る')}
          className="flex flex-col items-center justify-center bg-[#2C204B] text-white py-4 px-2 rounded-2xl font-bold text-sm shadow-xl hover:bg-[#3B2A65] transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/receive.png" alt="受け取る" className="w-8 h-8 mb-2" />
          受け取る
        </button>
        <button
          onClick={() => setScreen('取引履歴')}
          className="flex flex-col items-center justify-center bg-[#2C204B] text-white py-4 px-2 rounded-2xl font-bold text-sm shadow-xl hover:bg-[#3B2A65] transition-all duration-300 transform active:scale-95"
        >
          <img src="/icons/history.png" alt="取引履歴" className="w-8 h-8 mb-2" />
          履歴
        </button>
      </div>

      {/* 店舗モードの状態表示 */}
      <div className="bg-[#2C204B] p-6 rounded-2xl shadow-xl w-full max-w-md mb-6 text-center animate-fade-in-up delay-300">
        {isStoreMode ? (
          <>
            <p className="text-lg font-bold mb-2 text-green-400">店舗モード: ✅ 有効</p>
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
          className="mt-4 bg-gradient-to-r from-[#FF007F] to-[#CC00CC] text-white px-6 py-3 rounded-full text-md font-semibold shadow-lg hover:from-[#CC00CC] hover:to-[#FF007F] transition-all duration-300 transform active:scale-95"
        >
          アカウント設定へ
        </button>
      </div>

      {/* 新しいポイント広告ブロック */}
      <div className="bg-gradient-to-br from-[#4A148C] to-[#6A1B9A] p-6 rounded-2xl shadow-xl w-full max-w-md mb-6 animate-fade-in-up delay-150 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-2/5 overflow-hidden rounded-l-2xl">
          <img src="https://placehold.co/200x200/4A148C/FFFFFF?text=Points" alt="Points Icon" className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-12 opacity-80" style={{ width: '150%' }} />
        </div>
        <div className="relative z-10 text-right w-3/5 ml-auto">
          <p className="text-sm font-bold text-pink-200 mb-2">あなたのポイント</p>
          <h3 className="text-2xl font-extrabold text-white leading-tight mb-3">
            <span className="block">現在のポイント残高</span>
            <span className="block text-xl">{points.toLocaleString()}pt</span>
          </h3>
          <p className="text-xs text-gray-200 mb-4">
            ポイントの詳細を確認して、お得な情報を見つけよう！
          </p>
          <button
            onClick={() => setScreen('ポイント')}
            className="bg-gradient-to-r from-[#FF007F] to-[#CC00CC] text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg hover:from-[#CC00CC] hover:to-[#FF007F] transition-all duration-300"
          >
            ポイントを確認
          </button>
        </div>
      </div>

      {/* デイリーフリップのようなプロモーション/コンテンツブロックの例 */}
      <div className="bg-gradient-to-br from-[#FF007F] to-[#CC00CC] p-6 rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up delay-400 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-2/5 overflow-hidden rounded-r-2xl">
          <img src="https://placehold.co/300x200/FF007F/FFFFFF?text=RE-Mat+Card" alt="RE-Mat Card" className="absolute -right-8 top-1/2 -translate-y-1/2 rotate-12 opacity-80" style={{ width: '150%' }} />
        </div>
        <div className="relative z-10 text-left w-3/5">
          <p className="text-sm font-bold text-pink-200 mb-2">今週のスペシャル</p>
          <h3 className="text-2xl font-extrabold text-white leading-tight mb-3">
            <span className="block">ポイントアップ</span>
            <span className="block text-xl">キャンペーン開催中！</span>
          </h3>
          <p className="text-xs text-gray-200 mb-4">
            特定店舗での支払いでポイント2倍！今すぐチェック！
          </p>
          <button
            onClick={() => setScreen('points')}
            className="bg-gradient-to-r from-[#FF007F] to-[#CC00CC] text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg hover:from-[#CC00CC] hover:to-[#FF007F] transition-all duration-300"
          >
            詳細を見る
          </button>
        </div>
      </div>

    </div>
  );
};

export default HomeDashboard;
