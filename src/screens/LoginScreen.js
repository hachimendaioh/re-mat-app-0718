// src/screens/LoginScreen.js

import React, { useState, useCallback } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Firebase Authのログイン関数をインポート
import LoadingSpinner from '../components/common/LoadingSpinner'; // ローディングスピナーをインポート

/**
 * ログイン画面コンポーネント。
 * ユーザーがメールアドレスとパスワードでログインできるようにします。
 * @param {object} props - コンポーネントのプロパティ
 * @param {(screenName: string) => void} props.setScreen - 画面遷移関数
 * @param {(modalState: object) => void} props.setModal - カスタムモーダル表示関数
 * @param {object} props.auth - Firebase Authインスタンス
 * @param {(isLoading: boolean) => void} props.setIsLoading - アプリ全体のローディング状態を更新する関数
 * @param {(userId: string) => void} props.setUserId - ユーザーIDを更新する関数 (App.jsから直接渡される)
 */
const LoginScreen = ({ setScreen, setModal, auth, setIsLoading, setUserId }) => { // onLoginSuccess を setUserId に変更
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false); // ログイン処理中のローディング状態

  const handleLogin = useCallback(async () => {
    // デバッグ用ログ: 渡されたプロップスの型を確認
    console.log('LoginScreen Debug: Type of setScreen:', typeof setScreen);
    console.log('LoginScreen Debug: Type of setModal:', typeof setModal);
    console.log('LoginScreen Debug: Type of auth:', typeof auth);
    console.log('LoginScreen Debug: Type of setIsLoading:', typeof setIsLoading);
    console.log('LoginScreen Debug: Type of setUserId:', typeof setUserId); // onLoginSuccess から setUserId に変更

    if (!email || !password) {
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: '入力エラー',
          message: 'メールアドレスとパスワードを入力してください。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      } else {
        console.error('LoginScreen Error: setModal is not a function when showing input error.');
      }
      return;
    }

    setLoginLoading(true); // ログイン処理開始
    if (typeof setIsLoading === 'function') {
      setIsLoading(true); // アプリ全体のローディングも開始
    } else {
      console.error('LoginScreen Error: setIsLoading is not a function when starting login.');
    }

    try {
      // Firebase Authenticationでログイン
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ログイン成功
      console.log('Login successful:', user.uid);
      if (typeof setUserId === 'function') { // setUserIdが関数であることを確認
        setUserId(user.uid); // App.jsのuserIdを更新
      } else {
        console.error('LoginScreen Error: setUserId is not a function after successful login.');
      }
      if (typeof setScreen === 'function') {
        setScreen('home'); // ホーム画面へ遷移
      } else {
        console.error('LoginScreen Error: setScreen is not a function after successful login.');
      }
      if (typeof setModal === 'function') {
        setModal(prev => ({ ...prev, isOpen: false })); // モーダルを閉じる
      }

    } catch (error) {
      // Firebaseから返されたエラーオブジェクト全体をログに出力し、詳細を確認
      console.error('Login error (full object caught):', error);
      console.error('Login error (error.name):', error?.name);
      console.error('Login error (error.code):', error?.code);
      console.error('Login error (error.message):', error?.message);
      console.error('Login error (error.toString()):', error?.toString());


      let errorMessage = 'ログインに失敗しました。';

      // Firebaseエラーコードに基づいたメッセージを生成
      const errorCode = error?.code;
      const errorDetailMessage = error?.message || error?.toString();

      switch (errorCode) {
        case 'auth/invalid-email':
          errorMessage = '無効なメールアドレス形式です。';
          break;
        case 'auth/user-disabled':
          errorMessage = 'このアカウントは無効化されています。';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'メールアドレスまたはパスワードが間違っています。';
          break;
        case 'auth/too-many-requests':
          errorMessage = '複数回のログイン試行に失敗しました。セキュリティのため、しばらく待ってから再度お試しください。';
          break;
        default:
          errorMessage = `予期せぬエラーが発生しました。${errorDetailMessage ? `詳細: ${errorDetailMessage}` : ''} 再度お試しください。`;
          if (!errorDetailMessage && Object.keys(error).length === 0) {
            errorMessage = 'ログイン中に不明なエラーが発生しました。ブラウザの拡張機能を一時的に無効にしてお試しください。';
          }
      }

      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: 'ログイン失敗',
          message: errorMessage,
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      } else {
        console.error('LoginScreen Error: setModal is not a function when showing login error.');
      }
    } finally {
      setLoginLoading(false); // ログイン処理終了
      if (typeof setIsLoading === 'function') {
        setIsLoading(false); // アプリ全体のローディングも終了
      }
    }
  }, [email, password, auth, setScreen, setModal, setIsLoading, setUserId]); // onLoginSuccess を setUserId に変更

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">ログイン</h2>

        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-300 text-sm font-bold mb-2">
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            className="shadow appearance-none border border-gray-700 rounded-lg w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700"
            placeholder="your@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-300 text-sm font-bold mb-2">
            パスワード
          </label>
          <input
            type="password"
            id="password"
            className="shadow appearance-none border border-gray-700 rounded-lg w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loginLoading}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300 transform ${loginLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
        >
          {loginLoading ? <LoadingSpinner size="sm" /> : 'ログイン'}
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => setScreen('forgot_password')}
            className="inline-block align-baseline font-bold text-sm text-blue-400 hover:text-blue-300 mr-4"
          >
            パスワードを忘れた場合
          </button>
          <button
            onClick={() => setScreen('register')}
            className="inline-block align-baseline font-bold text-sm text-blue-400 hover:text-blue-300"
          >
            新規登録はこちら
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setScreen('guest_intro')}
            className="inline-block align-baseline font-bold text-sm text-gray-400 hover:text-gray-300"
          >
            ゲストとして続ける
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
