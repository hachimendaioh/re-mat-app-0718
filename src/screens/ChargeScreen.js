import React from 'react';

const ChargeScreen = ({ balance, setChargeAmount, handleCharge }) => {
  const amounts = [1000, 2000, 3000, 5000, 10000, 20000];

  return (
    <div className="p-4 text-white animate-fade-in font-inter"> {/* font-inter を追加 */}
      <h2 className="text-3xl font-bold mb-6 text-center">チャージ</h2>

      <div className="mx-4 bg-white rounded-xl shadow-lg p-5 mb-6 text-left text-black animate-slide-in-left">
        <div className="flex justify-between items-center mb-3 text-lg font-medium">
          <span className="text-gray-600">現在の残高</span>
          <span className="font-bold text-blue-600">¥{balance.toLocaleString()}</span>
        </div>
      </div>

      <p className="text-lg text-gray-300 mb-6 text-center">チャージ金額を選択してください</p>
      <div className="grid grid-cols-2 gap-4 bg-gray-800 p-6 rounded-xl shadow-lg">
        {amounts.map((amount) => (
          <button
            key={amount}
            onClick={() => {
              setChargeAmount(String(amount));
              handleCharge(amount);
            }}
            className="bg-blue-500 text-white px-6 py-4 rounded-xl text-xl font-bold shadow-md hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            ¥{amount.toLocaleString()}
          </button>
        ))}
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-right">
        <h3 className="text-xl font-bold mb-4 text-blue-300">その他のチャージオプション</h3>
        <ul className="space-y-3">
          {[
            { label: 'オートチャージ設定', icon: '⚙️' },
            { label: '銀行を追加', icon: '🏦' },
            { label: 'ATMチャージ', icon: '🏧' },
            { label: 'ポイント交換', icon: '✨' },
          ].map((item, index) => (
            <li key={index} className="flex items-center bg-gray-700 p-3 rounded-lg shadow-sm hover:bg-gray-600 transition-colors cursor-pointer">
              <span className="text-2xl mr-4">{item.icon}</span>
              <span className="text-white text-lg font-medium">{item.label}</span>
              <span className="ml-auto text-gray-400 text-lg">&gt;</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ChargeScreen;
