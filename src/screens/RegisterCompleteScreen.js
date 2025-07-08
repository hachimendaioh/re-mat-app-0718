import React, { useState } from 'react';
import { getAuth, sendEmailVerification } from 'firebase/auth';

const RegisterCompleteScreen = ({ setScreen, userEmail }) => {
  const [resendEmailError, setResendEmailError] = useState('');
  const [resendEmailSuccess, setResendEmailSuccess] = useState(false);

  const handleResendVerificationEmail = async () => {
    const user = getAuth().currentUser;
    if (user) {
      try {
        await sendEmailVerification(user);
        setResendEmailSuccess(true);
        setResendEmailError('');
        setTimeout(() => setResendEmailSuccess(false), 3000);
      } catch (error) {
        console.error("Error resending verification email:", error);
        setResendEmailError('認証メールの再送信に失敗しました。');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white animate-fade-in font-inter"> {/* font-inter を追加 */}
      <div className="text-center bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md animate-pop-success">
        <div className="text-6xl mb-6">📧</div>
        <h2 className="text-3xl font-bold mb-4">登録完了！</h2>
        <p className="text-lg text-gray-300 mb-6">
          ご登録ありがとうございます！<br/>
          {' '}<strong>{userEmail}</strong>{' '}宛に認証メールを送信しました。<br/>
          メール内のリンクをクリックして、アカウントを有効化してください。
        </p>
        <button
          onClick={() => setScreen('home')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 mb-4"
        >
          ホームへ戻る
        </button>
        <p className="text-gray-400 text-sm mt-4">
          メールが届かない場合は、迷惑メールフォルダをご確認いただくか、
        </p>
        <button
          onClick={handleResendVerificationEmail}
          className="text-blue-400 hover:text-blue-300 font-semibold text-sm focus:outline-none mt-2"
        >
          認証メールを再送信する
        </button>
        {resendEmailSuccess && <p className="text-green-400 text-sm mt-2">再送信しました！</p>}
        {resendEmailError && <p className="text-red-400 text-sm mt-2">{resendEmailError}</p>}
      </div>
    </div>
  );
};

export default RegisterCompleteScreen;
