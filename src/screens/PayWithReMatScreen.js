import React from 'react';

const PayWithReMatScreen = ({ balance, points, setScreen }) => (
  <div className="p-4 pb-48 text-white font-inter"> {/* font-inter を追加 */}
    <h2 className="text-3xl font-bold mb-6 text-center">リマット残高で支払う</h2>

    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex flex-col items-center animate-slide-in-right">
      <p className="text-black text-xl font-bold mb-4">支払い用バーコード</p>
      <img
        src="/icons/barcode_placeholder.png"
        alt="支払いバーコード"
        className="w-4/5 max-w-xs h-auto rounded-lg shadow-md"
      />
      <p className="text-gray-600 text-sm mt-3">（店舗側で読み取ります）</p>
    </div>

    <div className="mx-4 bg-white rounded-xl shadow-lg p-5 mb-6 text-left text-black animate-slide-in-left">
      <div className="flex justify-between items-center mb-3 text-lg font-medium">
        <span>現在の残高</span>
        <span className="text-blue-600 font-bold">¥{balance.toLocaleString()}</span>
      </div>
      <hr className="border-gray-300" />
      <div className="flex justify-between items-center mt-3 text-lg font-medium">
        <span>使えるポイント</span>
        <span className="text-green-600 font-bold">{points}pt</span>
      </div>
    </div>

    <div className="flex justify-center mt-8">
      <button
        onClick={() => setScreen('home')}
        className="bg-gray-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
      >
        ホームに戻る
      </button>
    </div>
  </div>
);

export default PayWithReMatScreen;
