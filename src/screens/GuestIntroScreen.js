import React from 'react';
import { signInAnonymously } from 'firebase/auth';

const GuestIntroScreen = ({ setScreen, setModal, auth }) => {
  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
      setScreen('home');
    } catch (error) {
      console.error("Guest login failed:", error);
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'ゲストログインに失敗しました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white animate-fade-in font-inter"> {/* font-inter を追加 */}
      <h1 className="text-4xl font-extrabold text-white mb-6 animate-fade-in-up">RE-Matへようこそ！</h1>
      <p className="text-lg text-gray-300 text-center mb-8 animate-fade-in-up delay-100">
        アカウントを作成またはログインして、<br/>
        すべての機能をお楽しみください。
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => setScreen('login')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 animate-slide-in-right"
        >
          ログイン
        </button>
        <button
          onClick={() => setScreen('register')}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 animate-slide-in-left"
        >
          アカウントを作成
        </button>
        <button
          onClick={() => setScreen('account_benefits')}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 animate-fade-in-up delay-200"
        >
          ゲストとして続ける
        </button>
      </div>
    </div>
  );
};

export default GuestIntroScreen;
