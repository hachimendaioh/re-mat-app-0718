import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ForgotPasswordScreen = ({ setScreen, setModal, auth, setIsLoading }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) {
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'メールアドレスを入力してください。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    setLoading(true);
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setModal({
        isOpen: true,
        title: 'パスワードリセット',
        message: 'パスワードリセットのメールを送信しました。メールをご確認ください。',
        onConfirm: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          setScreen('login');
        },
        showCancelButton: false,
      });
    } catch (error) {
      console.error("Password reset failed:", error);
      let errorMessage = 'パスワードリセットメールの送信に失敗しました。';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません。';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = '入力されたメールアドレスのアカウントは見つかりませんでした。';
      }
      setModal({
        isOpen: true,
        title: 'エラー',
        message: errorMessage,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white animate-fade-in font-inter"> {/* font-inter を追加 */}
      {loading && <LoadingSpinner />}
      <h2 className="text-3xl font-bold mb-6 text-center">パスワードをリセット</h2>

      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg animate-slide-in-right">
        <p className="text-gray-300 text-center mb-6">
          登録済みのメールアドレスを入力してください。<br />
          パスワードリセットのリンクを送信します。
        </p>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="resetEmail">
            メールアドレス
          </label>
          <input
            type="email"
            id="resetEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
            placeholder="登録済みメールアドレス"
          />
        </div>
        <button
          onClick={handlePasswordReset}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          パスワードをリセットする
        </button>
        <p className="text-center text-gray-400 text-sm mt-6">
          <button
            onClick={() => setScreen('login')}
            className="text-blue-400 hover:text-blue-300 font-semibold focus:outline-none"
          >
            ログイン画面に戻る
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
