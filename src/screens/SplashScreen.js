import React from 'react';

const SplashScreen = ({ lastUpdated }) => (
  <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 font-inter"> {/* font-inter を追加 */}
    <div className="animate-fade-in-up">
      <h1 className="text-6xl font-extrabold text-white tracking-wider animate-bounce-in">RE-Mat</h1>
      <p className="text-lg text-gray-400 mt-4 text-center animate-fade-in-up delay-100">
        あなたの毎日をスマートに
      </p>
    </div>
    <div className="absolute bottom-10 text-gray-400 text-sm animate-fade-in delay-500">
      最終更新: {lastUpdated}
    </div>
  </div>
);

export default SplashScreen;
