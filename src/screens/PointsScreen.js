import React from 'react';

const PointsScreen = ({ points }) => (
  <div className="p-4 pb-48 text-white animate-fade-in font-inter"> {/* font-inter を追加 */}
    <h2 className="text-3xl font-bold mb-6 text-center">ポイント</h2>
    <div className="bg-white rounded-xl shadow-lg p-6 text-center text-black">
      <p className="text-lg mb-2">現在のポイント</p>
      <p className="text-6xl font-extrabold text-green-600">{points}<span className="text-3xl">pt</span></p>
    </div>
  </div>
);

export default PointsScreen;
