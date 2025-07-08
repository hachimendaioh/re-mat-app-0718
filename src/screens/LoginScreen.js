import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';

const LoginScreen = ({ setScreen, setModal, auth, setIsLoading, setUserId }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // ★ここからデバッグログを追加
      console.log("LoginScreen Debug: setUserId exists?", !!setUserId);
      console.log("LoginScreen Debug: Type of setUserId:", typeof setUserId);
      console.log("LoginScreen Debug: Value of setUserId:", setUserId);
      // ★ここまでデバッグログを追加

      setUserId(userCredential.user.uid); // この行でエラーが発生している可能性があります
      setScreen('home');
    } catch (error) {
      console.error("Login failed:", error);
      let errorMessage = 'ログインに失敗しました。';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません。';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが間違っています。';
      }
      setModal({
        isOpen: true,
        title: 'ログインエラー',
        message: errorMessage,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white animate-fade-in font-inter"> {/* font-inter を追加 */}
      <h2 className="text-3xl font-bold mb-6 text-center">ログイン</h2>

      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg animate-slide-in-right">
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
            placeholder="メールアドレス"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
            パスワード
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 pr-10"
              placeholder="パスワード"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.879 9.879a3 3 0 014.242 4.242M13.875 18.825L6.879 11.829m3.364 3.364l-3.364 3.364m-3.92-3.92l3.364-3.364" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <p className="text-right text-sm mt-2">
            <button
              onClick={() => setScreen('forgot_password')}
              className="text-blue-400 hover:text-blue-300 font-semibold focus:outline-none"
            >
              パスワードをお忘れですか？
            </button>
          </p>
        </div>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          ログイン
        </button>
        <p className="text-center text-gray-400 text-sm mt-6">
          アカウントをお持ちではありませんか？{' '}
          <button
            onClick={() => setScreen('register')}
            className="text-blue-400 hover:text-blue-300 font-semibold focus:outline-none"
          >
            新規登録
          </button>
        </p>
        <p className="text-center text-gray-400 text-sm mt-2">
          <button
            onClick={() => setScreen('guest_intro')}
            className="text-gray-500 hover:text-gray-400 font-semibold focus:outline-none"
          >
            戻る
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
