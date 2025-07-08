import React from 'react';

const AccountBenefitsScreen = ({ setScreen }) => (
  <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white animate-fade-in font-inter">
    <h2 className="text-3xl font-bold mb-6 text-center">アカウント作成のメリット</h2>
    <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg animate-slide-in-right">
      <ul className="space-y-4 text-lg text-gray-200 mb-8">
        <li className="flex items-center">
          <span className="text-green-400 mr-3 text-2xl">✅</span>
          <span>**残高とポイントの保存**: アプリを閉じても、チャージした残高や貯めたポイントが消えません。</span>
        </li>
        <li className="flex items-center">
          <span className="text-green-400 mr-3 text-2xl">✅</span>
          <span>**取引履歴の確認**: 過去の支払い履歴やチャージ履歴をいつでも確認できます。</span>
        </li>
        <li className="flex items-center">
          <span className="text-green-400 mr-3 text-2xl">✅</span>
          <span>**複数デバイスでの利用**: 異なるスマートフォンやタブレットから同じアカウントで利用できます。</span>
        </li>
        <li className="flex items-center">
          <span className="text-green-400 mr-3 text-2xl">✅</span>
          <span>**セキュリティの向上**: メール認証により、アカウントの安全性が高まります。</span>
        </li>
        <li className="flex items-center">
          <span className="text-green-400 mr-3 text-2xl">✅</span>
          <span>**特別なキャンペーン**: アカウント保有者限定のお得な情報やキャンペーンに参加できます。</span>
        </li>
      </ul>
      <button
        onClick={() => setScreen('register')}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 mb-4"
      >
        今すぐアカウントを作成
      </button>
      <button
        onClick={() => setScreen('home')}
        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95"
      >
        ゲストとしてホームへ
      </button>
    </div>
  </div>
);

export default AccountBenefitsScreen;
