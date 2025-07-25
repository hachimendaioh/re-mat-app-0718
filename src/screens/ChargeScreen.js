import React, { useState, useCallback, useEffect } from 'react';

const ChargeScreen = ({ balance, chargeAmount, setChargeAmount, handleCharge, setScreen, setModal, setToast }) => {
  // 選択されたチャージ方法を管理する新しいstate
  const [selectedMethod, setSelectedMethod] = useState(null); // 'credit_card', 'bank_transfer', 'convenience_store', 're_mat_balance'

  // チャージ方法の表示名マップ
  const methodNameMap = {
    'credit_card': 'クレジットカード',
    'bank_transfer': '銀行振込',
    'convenience_store': 'コンビニ決済',
    're_mat_balance': 'Re-Mat残高' // 既存のチャージ方法
  };

  // チャージ方法が選択されたときのハンドラ
  const handleSelectMethod = useCallback((method) => {
    setSelectedMethod(method);
    // Re-Mat残高以外の外部決済方法が選択された場合、デモ用のモーダルを表示
    if (method !== 're_mat_balance') {
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: `${methodNameMap[method]}連携 (デモ)`,
          message: `これはデモ機能です。実際の${methodNameMap[method]}連携には、決済ゲートウェイとのセキュアなAPI統合が必要です。\n\nセキュリティとコンプライアンスの要件を満たすため、本番環境では専門の決済サービスをご利用ください。`,
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    }
  }, [setModal]);

  // コンポーネントがマウントされたとき、またはチャージ画面に遷移したときに金額入力をリセット
  useEffect(() => {
    if (typeof setChargeAmount === 'function') {
      setChargeAmount('');
    }
    // 画面がロードされたときに、選択された方法をリセット
    setSelectedMethod(null);
  }, [setChargeAmount]);


  // まだチャージ方法が選択されていない場合、選択肢を表示
  if (!selectedMethod) {
    return (
      // メインコンテナの背景をグラデーションに調整
      <div className="p-4 text-white text-center animate-fade-in font-inter min-h-screen bg-gradient-to-br from-[#1A032E] to-[#3A0F5B]">
        {/* タイトル色の調整 */}
        <h2 className="text-3xl font-bold mb-6 text-white">チャージ方法を選択</h2>

        {/* 現在の残高を上部に表示 - HomeDashboardのスタイルに合わせる */}
        <div className="bg-gradient-to-br from-[#4A148C] to-[#6A1B9A] rounded-2xl shadow-xl p-6 mb-6 animate-slide-in-right relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white opacity-10 rounded-full blur-md"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white opacity-5 rounded-full blur-sm"></div>
          <p className="text-gray-300 text-lg mb-2">現在の残高</p>
          <p className="text-white text-4xl font-extrabold">
            ¥{balance.toLocaleString()}
          </p>
        </div>

        {/* チャージ方法選択ボタンのスタイル調整 */}
        <div className="flex flex-col space-y-4 max-w-sm mx-auto bg-[#2C204B] p-6 rounded-2xl shadow-xl">
          <button
            onClick={() => handleSelectMethod('credit_card')}
            className="bg-purple-600 text-white px-6 py-3 rounded-full text-lg font-bold shadow-md hover:bg-purple-700 transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <span className="text-2xl">💳</span> <span>クレジットカード</span>
          </button>
          <button
            onClick={() => handleSelectMethod('bank_transfer')}
            className="bg-purple-600 text-white px-6 py-3 rounded-full text-lg font-bold shadow-md hover:bg-purple-700 transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <span className="text-2xl">🏦</span> <span>銀行振込</span>
          </button>
          <button
            onClick={() => handleSelectMethod('convenience_store')}
            className="bg-purple-600 text-white px-6 py-3 rounded-full text-lg font-bold shadow-md hover:bg-purple-700 transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <span className="text-2xl">🏪</span> <span>コンビニ決済</span>
          </button>
          {/* 既存のRe-Mat残高へのチャージ方法 */}
          <button
            onClick={() => handleSelectMethod('re_mat_balance')}
            className="bg-purple-600 text-white px-6 py-3 rounded-full text-lg font-bold shadow-md hover:bg-purple-700 transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <span className="text-2xl">💰</span> <span>Re-Mat残高をチャージ</span>
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
  }

  // チャージ方法が選択された後、金額入力とチャージボタンを表示
  return (
    // メインコンテナの背景をグラデーションに調整
    <div className="p-4 text-white text-center animate-fade-in font-inter min-h-screen bg-gradient-to-br from-[#1A032E] to-[#3A0F5B]">
      {/* タイトル色の調整 */}
      <h2 className="text-3xl font-bold mb-4 text-white">チャージ ({methodNameMap[selectedMethod]})</h2>

      {/* 現在の残高を上部に大きく表示 - HomeDashboardのスタイルに合わせる */}
      <div className="bg-gradient-to-br from-[#4A148C] to-[#6A1B9A] rounded-2xl shadow-xl p-6 mb-6 animate-slide-in-right relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white opacity-10 rounded-full blur-md"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white opacity-5 rounded-full blur-sm"></div>
        <p className="text-gray-300 text-lg mb-2">現在の残高</p>
        <p className="text-white text-4xl font-extrabold">
          ¥{balance.toLocaleString()}
        </p>
      </div>

      {/* 金額入力とチャージボタンのコンテナのスタイル調整 */}
      <div className="bg-[#2C204B] rounded-2xl shadow-xl p-6 mb-6 animate-slide-in-right">
        <p className="text-gray-300 text-lg mb-4">チャージ金額を入力してください</p>
        <input
          type="number"
          value={chargeAmount}
          onChange={(e) => {
            if (typeof setChargeAmount === 'function') setChargeAmount(e.target.value);
            // エラー表示をクリアするロジックが必要であればここに追加
          }}
          placeholder="金額を入力"
          className="text-black text-center text-2xl font-bold w-full p-3 rounded-lg mb-4 bg-gray-100 focus:ring-2 focus:ring-purple-500 transition-all duration-200" 
          inputMode="numeric"
          pattern="[0-9]*"
        />

        <button
          // handleChargeに選択されたメソッドも渡す
          onClick={() => handleCharge(parseInt(chargeAmount, 10), selectedMethod)}
          className="bg-purple-600 text-white px-8 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-purple-700 transition-all duration-300 transform active:scale-95" 
        >
          チャージを確定する
        </button>
      </div>

      <button
        onClick={() => setSelectedMethod(null)} // チャージ方法選択に戻る
        className="mt-4 bg-gray-600 text-white px-6 py-2 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform active:scale-95"
      >
        チャージ方法を変更
      </button>

      <button
        onClick={() => setScreen('home')}
        className="mt-4 bg-gray-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
      >
        ホームに戻る
      </button>
    </div>
  );
};

export default ChargeScreen;
