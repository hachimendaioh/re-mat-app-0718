import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const RegisterScreen = ({ setScreen, setModal, auth, setIsLoading, setUserId, db, appId }) => {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getPasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 1;
    if (/[A-Z]/.test(pwd)) strength += 1;
    if (/[a-z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;

    switch (strength) {
      case 0: return { text: '', color: 'text-gray-400' };
      case 1: return { text: '非常に弱い', color: 'text-red-500' };
      case 2: return { text: '弱い', color: 'text-orange-500' };
      case 3: return { text: '普通', color: 'text-yellow-500' };
      case 4: return { text: '強い', color: 'text-green-500' };
      case 5: return { text: '非常に強い', color: 'text-blue-500' };
      default: return { text: '', color: 'text-gray-400' };
    }
  };
  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setPasswordError('パスワードが一致しません。');
      return;
    }
    setPasswordError('');

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'userProfile');
      await setDoc(userProfileRef, {
        name: userName || '',
        email: user.email,
        balance: 0,
        points: 0,
        createdAt: serverTimestamp()
      });

      await sendEmailVerification(user);

      setUserId(user.uid);
      setScreen('register_complete');

    } catch (error) {
      console.error("Registration failed:", error);
      let errorMessage = 'アカウント作成に失敗しました。';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません。';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードが弱すぎます。8文字以上で英数字記号を組み合わせましょう。';
      }
      setModal({
        isOpen: true,
        title: '登録エラー',
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
      <h2 className="text-3xl font-bold mb-6 text-center">アカウント作成</h2>

      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg animate-slide-in-left">
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="registerName">
            名前 (任意)
          </label>
          <input
            type="text"
            id="registerName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
            placeholder="あなたの名前"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="registerEmail">
            メールアドレス
          </label>
          <input
            type="email"
            id="registerEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
            placeholder="メールアドレス"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="registerPassword">
            パスワード
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="registerPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-1 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 pr-10"
              placeholder="パスワード (8文字以上)"
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
          <p className={`text-sm ${passwordStrength.color}`}>{passwordStrength.text}</p>
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="confirmPassword">
            パスワード (確認用)
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 pr-10"
              placeholder="パスワードをもう一度入力"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showConfirmPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.879 9.879a3 3 0 014.242 4.242M13.875 18.825L6.879 11.829m3.364 3.364l-3.364 3.364m-3.92-3.92l3.364-3.364" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          {passwordError && <p className="text-red-400 text-sm mt-2">{passwordError}</p>}
        </div>
        <button
          onClick={handleRegister}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          アカウントを作成
        </button>
        <p className="text-center text-gray-400 text-sm mt-6">
          既にアカウントをお持ちですか？{' '}
          <button
            onClick={() => setScreen('login')}
            className="text-blue-400 hover:text-blue-300 font-semibold focus:outline-none"
          >
            ログイン
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

export default RegisterScreen;
