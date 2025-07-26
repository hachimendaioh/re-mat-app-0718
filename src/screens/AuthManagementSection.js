// src/screens/AuthManagementSection.js

import React, { useState, useCallback } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, linkWithCredential, sendEmailVerification, updatePassword } from 'firebase/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { doc, updateDoc } from 'firebase/firestore'; // Firestore更新のために追加

const AuthManagementSection = ({
  auth,
  db,
  userId,
  appId,
  setModal,
  setToast,
  isAnonymousUser,
  setIsAnonymousUser, // App.jsのisAnonymousUserを更新
  userEmail,
  setUserEmail,
  isEmailVerified,
  setIsEmailVerified, // App.jsのisEmailVerifiedを更新
  setScreen // アカウント連携後の画面遷移用
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isPasswordChanging, setIsPasswordChanging] = useState(false); // パスワード変更モード用
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 新しいパスワードの表示/非表示
  const [showCurrentPassword, setShowCurrentPassword] = useState(false); // 現在のパスワードの表示/非表示
  const [isLoading, setIsLoading] = useState(false); // このセクション内のローディング

  // パスワード強度の計算関数
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
  const newPasswordStrength = getPasswordStrength(newPassword);

  // メールアドレス更新/アカウント連携ハンドラ
  const handleUpdateEmail = async (isLinkAccount = false) => {
    const user = auth.currentUser;
    if (!user) {
      setModal({
        isOpen: true,
        title: 'エラー',
        message: '認証済みのユーザーではありません。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    if (!userEmail || (!isLinkAccount && !currentPassword) || (isLinkAccount && (!newPassword || newPassword !== confirmNewPassword))) {
      let errorMessage = '';
      if (!userEmail) errorMessage = 'メールアドレスを入力してください。';
      else if (!isLinkAccount && !currentPassword) errorMessage = '現在のパスワードを入力してください。';
      else if (isLinkAccount && !newPassword) errorMessage = '新しいパスワードを入力してください。';
      else if (isLinkAccount && newPassword !== confirmNewPassword) {
        errorMessage = 'パスワードが一致しません。';
        setPasswordError('パスワードが一致しません。');
      }
      setModal({
        isOpen: true,
        title: 'エラー',
        message: errorMessage,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }
    setPasswordError('');

    setIsLoading(true);
    try {
      if (user.isAnonymous) {
        // 匿名アカウントの連携
        const credential = EmailAuthProvider.credential(userEmail, newPassword);
        await linkWithCredential(user, credential);

        setToast({
          message: 'メールアドレスとパスワードをアカウントに紐付けました。今後はこのメールアドレスでログインできます。',
          type: 'success',
        });
        setIsEmailVerified(user.emailVerified); // App.jsのisEmailVerifiedを更新
        setIsAnonymousUser(false); // App.jsのisAnonymousUserを更新
        setNewPassword('');
        setConfirmNewPassword('');
        setCurrentPassword(''); // 念のためリセット
        // 連携後、必要に応じて画面遷移
        // setScreen('home'); // 例: ホーム画面に戻る
      } else {
        // 既存ユーザーのメールアドレス更新
        if (user.email === userEmail && !isLinkAccount) {
          setToast({
            message: '現在登録されているメールアドレスと同じです。',
            type: 'info',
          });
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Firebase AuthのupdateEmail関数は直接インポートして使用
        // 例: import { updateEmail } from 'firebase/auth';
        // await updateEmail(user, userEmail); 

        setToast({
          message: 'メールアドレスを更新しました。',
          type: 'success',
        });
        setIsEmailVerified(user.emailVerified);
        setCurrentPassword('');
      }

      // Firestoreのユーザープロファイルも更新
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(userProfileRef, { email: userEmail });

    } catch (error) {
      console.error("Error updating email:", error);
      let errorMessage = 'メールアドレスの更新中にエラーが発生しました。';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません。';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = '現在のパスワードが間違っています。';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'セキュリティのため、最近ログインが必要です。再度ログインしてからお試しください。';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'この操作は許可されていません。Firebaseプロジェクトの認証設定を確認してください。';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードが弱すぎます。8文字以上で英数字記号を組み合わせましょう。';
      } else if (error.code === 'auth/missing-email') {
          errorMessage = 'メールアドレスが設定されていません。匿名ユーザーの場合、まずメールアドレスとパスワードを設定してください。';
      }
      setModal({
        isOpen: true,
        title: 'エラー',
        message: errorMessage,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // パスワード変更ハンドラ
  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'パスワードを変更するには、アカウント登録が必要です。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    if (!currentPassword || !newPassword || newPassword !== confirmNewPassword) {
      let errorMessage = '';
      if (!currentPassword) errorMessage = '現在のパスワードを入力してください。';
      else if (!newPassword) errorMessage = '新しいパスワードを入力してください。';
      else if (newPassword !== confirmNewPassword) {
        errorMessage = '新しいパスワードが一致しません。';
        setPasswordError('新しいパスワードが一致しません。');
      }
      setModal({
        isOpen: true,
        title: 'エラー',
        message: errorMessage,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }
    setPasswordError('');

    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      setToast({
        message: 'パスワードが正常に変更されました。',
        type: 'success',
      });
      setIsPasswordChanging(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error("Error changing password:", error);
      let errorMessage = 'パスワードの変更に失敗しました。';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = '現在のパスワードが間違っています。';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '新しいパスワードが弱すぎます。8文字以上で英数字記号を組み合わせましょう。';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'セキュリティのため、最近ログインが必要です。再度ログインしてからお試しください。';
      }
      setModal({
        isOpen: true,
        title: 'エラー',
        message: errorMessage,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 認証メール再送信ハンドラ
  const handleSendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      setModal({
        isOpen: true,
        title: 'エラー',
        message: '認証メールを送信するには、有効なメールアドレスが設定されている必要があります。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    if (isAnonymousUser) {
      setModal({
        isOpen: true,
        title: '機能制限',
        message: '認証メールを送信するには、アカウント登録が必要です。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendEmailVerification(user);
      setToast({
        message: '認証メールを再送信しました。ご確認ください。',
        type: 'success',
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      setToast({
        message: `認証メールの送信中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-left">
      <h3 className="text-xl font-bold mb-4 text-blue-300">
        {isAnonymousUser ? 'アカウント連携' : '基本情報'}
      </h3>
      {isLoading && <LoadingSpinner />} {/* このセクションのローディング */}

      {isAnonymousUser ? ( // 匿名ユーザーの場合の連携フォーム
        <>
          <p className="text-gray-300 text-sm mb-4">
            現在のゲストアカウントを、メールアドレスとパスワードで保護されたアカウントに連携します。
          </p>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="linkEmail">
              メールアドレス
            </label>
            <input
              type="email"
              id="linkEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
              placeholder="メールアドレス"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="linkNewPassword">
              新しいパスワード
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="linkNewPassword"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 mb-1 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 pr-10"
                placeholder="8文字以上のパスワード"
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
            <p className={`text-sm ${newPasswordStrength.color}`}>{newPasswordStrength.text}</p>
          </div>
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="linkConfirmPassword">
              新しいパスワード (確認用)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="linkConfirmPassword"
                value={confirmNewPassword}
                onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(''); }}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 pr-10"
                placeholder="パスワードをもう一度入力"
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
            {passwordError && <p className="text-red-400 text-sm mt-2">{passwordError}</p>}
          </div>
          <button
            onClick={() => handleUpdateEmail(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-green-600 transition-all duration-300 transform hover:scale-105 w-full"
          >
            アカウントを連携する
          </button>
        </>
      ) : ( // 通常のユーザーの場合の基本情報編集フォーム
        <>
          {/* メールアドレス */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="userEmail">
              メールアドレス
            </label>
            <input
              type="email"
              id="userEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-2"
              placeholder="新しいメールアドレスを入力"
            />
            <label className="block text-gray-400 text-sm font-bold mb-2 mt-4" htmlFor="currentPassword">
              現在のパスワード
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-4 pr-10"
                placeholder="現在のパスワードを入力"
              />
               <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showCurrentPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.879 9.879a3 3 0 014.242 4.242M13.875 18.825L6.879 11.829m3.364 3.364l-3.364 3.364m-3.92-3.92l3.364-3.364" />
                  ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => handleUpdateEmail(false)}
              className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-purple-600 transition-all duration-300 transform hover:scale-105 w-full"
            >
              メールアドレスを更新
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2">
              メール認証ステータス
            </label>
            <div className="flex items-center">
              <span className={`text-lg font-bold ${isEmailVerified ? 'text-green-400' : 'text-red-400'}`}>
                {isEmailVerified ? '✅ 認証済み' : '❌ 未認証'}
              </span>
              {!isEmailVerified && userEmail && (
                <button
                  onClick={handleSendVerificationEmail}
                  className="ml-4 bg-yellow-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-yellow-600 transition-all duration-300 transform hover:scale-105"
                >
                  認証メールを再送信
                </button>
              )}
            </div>
          </div>

          {/* パスワード変更セクション */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-blue-300">パスワード変更</h3>
            {isPasswordChanging ? (
              <>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="currentPasswordChange">
                    現在のパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="currentPasswordChange"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-4 pr-10"
                      placeholder="現在のパスワードを入力"
                    />
                     <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                    >
                      <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showCurrentPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.879 9.879a3 3 0 014.242 4.242M13.875 18.825L6.879 11.829m3.364 3.364l-3.364 3.364m-3.92-3.92l3.364-3.364" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="newPasswordChange">
                    新しいパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="newPasswordChange"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 mb-1 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 pr-10"
                      placeholder="8文字以上のパスワード"
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
                  <p className={`text-sm ${newPasswordStrength.color}`}>{newPasswordStrength.text}</p>
                </div>
                <div className="mb-6">
                  <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="confirmNewPasswordChange">
                    新しいパスワード (確認用)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmNewPasswordChange"
                      value={confirmNewPassword}
                      onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(''); }}
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 pr-10"
                      placeholder="パスワードをもう一度入力"
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
                  {passwordError && <p className="text-red-400 text-sm mt-2">{passwordError}</p>}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setIsPasswordChanging(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setPasswordError('');
                    }}
                    className="bg-gray-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 mr-2"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
                  >
                    パスワードを変更
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsPasswordChanging(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 w-full"
              >
                パスワードを変更する
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AuthManagementSection;
