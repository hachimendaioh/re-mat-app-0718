// src/screens/ProfileDetailsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
// 必要なFirestore関数をすべてインポート
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
// 必要なFirebase Auth関数をすべてインポート
import { EmailAuthProvider, reauthenticateWithCredential, linkWithCredential, sendEmailVerification, updatePassword } from 'firebase/auth';
// StorageはProfileImageEditSectionで直接使用するため、ここでは不要
// import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CustomModal from '../components/common/CustomModal';

// ★追加: 分割したコンポーネントをインポート ★
import ProfileImageEditSection from './ProfileImageEditSection';
import BasicInfoEditSection from './BasicInfoEditSection';
import StoreSettingsSection from './StoreSettingsSection';


const ProfileDetailsScreen = ({
  db,
  userId,
  appId,
  setModal,
  setToast,
  auth, // Firebase Authインスタンス
  setScreen, // 画面遷移用
  // App.jsから渡される主要なstateとセッター
  userName: appUserName, // App.jsのuserName (現在の値)
  setUserName: setAppUserName, // App.jsのsetUserName (App.jsのuserName stateを更新する関数)
  profileImage: appProfileImage, // App.jsのprofileImage
  handleProfileImageUpload: handleAppProfileImageUpload, // App.jsのhandleProfileImageUpload (プロフィール画像URLをApp.jsに同期するため)
  isAnonymousUser: appIsAnonymousUser, // App.jsのisAnonymousUser (匿名ユーザーかどうか)
  isStoreMode, // App.jsから受け取るisStoreMode
  setIsStoreMode, // App.jsのsetIsStoreModeを更新する関数
  storeLogo, // App.jsから受け取るstoreLogo
  handleStoreLogoUpload // App.jsのhandleStoreLogoUploadを更新する関数
}) => {
  // ★削除: localUserName, phoneNumber, zipCode, prefecture, city, streetAddress, buildingName のstateを削除 ★
  // これらの状態はBasicInfoEditSectionで管理されます。

  const [userEmail, setUserEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // パスワード変更関連のstate
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false); // パスワード変更フォームの表示/非表示

  const [isLoading, setIsLoading] = useState(true); // 画面全体のローディング (初期データ読み込み用)
  const [isSaving, setIsSaving] = useState(false); // 保存/更新中のローディング (各操作用)

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

  // ★修正: プロフィールデータをFirestoreから読み込む関数を簡素化 (メールアドレスと認証ステータスのみ) ★
  const fetchAuthData = useCallback(async () => {
    if (!auth || !auth.currentUser) {
      setIsLoading(false);
      setUserEmail('');
      setIsEmailVerified(false);
      return;
    }

    setIsLoading(true);
    try {
      // ユーザーのメールアドレスと認証ステータスを直接Authから取得
      setUserEmail(auth.currentUser.email || '');
      setIsEmailVerified(auth.currentUser.emailVerified || false);
    } catch (error) {
      console.error("ProfileDetailsScreen: Error fetching auth data:", error);
      setToast({ message: `認証情報の読み込みに失敗しました: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [auth, setToast]);

  useEffect(() => {
    fetchAuthData();
  }, [fetchAuthData]);

  // ★削除: handleLocalProfileImageUploadとhandleSaveProfileを削除 ★
  // これらの関数はProfileImageEditSectionとBasicInfoEditSectionに移動しました。


  // メールアドレス更新/アカウント連携ハンドラ
  const handleUpdateEmail = useCallback(async (isLinkAccount = false) => {
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

    setIsSaving(true);
    setModal({
      isOpen: true,
      title: isLinkAccount ? 'アカウント連携中' : 'メールアドレス更新中',
      message: '処理を実行しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

    try {
      if (user.isAnonymous) {
        // 匿名アカウントの連携
        const credential = EmailAuthProvider.credential(userEmail, newPassword);
        await linkWithCredential(user, credential);

        setToast({
          message: 'メールアドレスとパスワードをアカウントに紐付けました。今後はこのメールアドレスでログインできます。',
          type: 'success',
        });
        setIsEmailVerified(user.emailVerified);
        setNewPassword('');
        setConfirmNewPassword('');
        setCurrentPassword('');
        // App.jsのisAnonymousUserも更新する必要があるが、これはAccountScreenのfetchUserProfileで更新される
      } else {
        if (user.email === userEmail && !isLinkAccount) {
          setToast({
            message: '現在登録されているメールアドレスと同じです。',
            type: 'info',
          });
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // await updateEmail(user, userEmail); // updateEmail関数は別途インポートが必要

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
      setModal(prev => ({ ...prev, isOpen: false }));
      setIsSaving(false);
    }
  }, [auth, userEmail, currentPassword, newPassword, confirmNewPassword, db, userId, appId, setModal, setToast, setIsEmailVerified]);


  // パスワード変更ハンドラ
  const handleChangePassword = useCallback(async () => {
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

    setIsSaving(true);
    setModal({
      isOpen: true,
      title: 'パスワード変更中',
      message: 'パスワードを変更しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      setToast({ message: 'パスワードが正常に変更されました。', type: 'success' });
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
      setModal(prev => ({ ...prev, isOpen: false }));
      setIsSaving(false);
    }
  }, [auth, currentPassword, newPassword, confirmNewPassword, setModal, setToast]);


  // 認証メール再送信ハンドラ
  const handleSendVerificationEmail = useCallback(async () => {
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

    if (appIsAnonymousUser) {
      setModal({
        isOpen: true,
        title: '機能制限',
        message: '認証メールを送信するには、アカウント登録が必要です。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    setIsSaving(true);
    setModal({
      isOpen: true,
      title: '認証メール再送信中',
      message: '認証メールを送信しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });
    try {
      await sendEmailVerification(user);
      setToast({ message: '認証メールを再送信しました。ご確認ください。', type: 'success' });
    } catch (error) {
      console.error("Error sending verification email:", error);
      setToast({ message: `認証メールの送信中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`, type: 'error' });
    } finally {
      setModal(prev => ({ ...prev, isOpen: false }));
      setIsSaving(false);
    }
  }, [auth, appIsAnonymousUser, setModal, setToast]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <LoadingSpinner />
        <p className="ml-4">プロフィールを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-4 text-white animate-fade-in font-inter">
      <h2 className="text-3xl font-bold mb-6 text-center text-yellow-300">プロフィール詳細</h2>

      {appIsAnonymousUser && (
        <div className="mb-6 p-4 bg-yellow-600 rounded-xl shadow-lg text-center animate-bounce-in">
          <p className="font-bold text-lg mb-2">💡 ゲストユーザーです</p>
          <p className="text-sm">
            残高やポイントを保存し、全ての機能をご利用いただくには、<br/>
            アカウント登録またはログインが必要です。
          </p>
          <button
            onClick={() => setScreen('register')}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full text-md font-semibold hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
          >
            アカウントを登録して連携する
          </button>
        </div>
      )}

      {/* ★修正: ProfileImageEditSectionコンポーネントをレンダリング ★ */}
      <ProfileImageEditSection
        profileImage={appProfileImage}
        handleProfileImageUpload={handleAppProfileImageUpload}
        db={db}
        userId={userId}
        appId={appId}
        setModal={setModal}
        setToast={setToast}
        isAnonymousUser={appIsAnonymousUser}
        isSaving={isSaving} // 親のisSavingを渡す
      />

      {/* ★修正: BasicInfoEditSectionコンポーネントをレンダリング ★ */}
      <BasicInfoEditSection
        db={db}
        userId={userId}
        appId={appId}
        setModal={setModal}
        setToast={setToast}
        userName={appUserName}
        setUserName={setAppUserName}
        isAnonymousUser={appIsAnonymousUser}
        isSaving={isSaving} // 親のisSavingを渡す
        setIsSaving={setIsSaving} // 親のsetIsSavingを渡す
      />

      {/* メールアドレスとパスワード管理 (このセクションはProfileDetailsScreenに残す) */}
      {!appIsAnonymousUser && (
        <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-blue-300">アカウント認証情報</h3>
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
              placeholder="メールアドレス"
              disabled={isSaving}
            />
            {/* 匿名ユーザーの場合、アカウント連携用のパスワード入力フィールドを表示 */}
            {auth?.currentUser?.isAnonymous && (
              <>
                <label className="block text-gray-400 text-sm font-bold mb-2 mt-4" htmlFor="newPasswordLink">
                  新しいパスワード (アカウント連携用)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPasswordLink"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-1 pr-10"
                    placeholder="8文字以上のパスワード"
                    disabled={isSaving}
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
                <label className="block text-gray-400 text-sm font-bold mb-2 mt-4" htmlFor="confirmNewPasswordLink">
                  新しいパスワード (確認用)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmNewPasswordLink"
                    value={confirmNewPassword}
                    onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(''); }}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 pr-10"
                    placeholder="パスワードをもう一度入力"
                    disabled={isSaving}
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
              </>
            )}

            <button
              onClick={() => handleUpdateEmail(auth?.currentUser?.isAnonymous)} // 匿名ユーザーの場合はアカウント連携
              className={`bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105 w-full
                ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'hover:bg-purple-600'}`}
              disabled={isSaving}
            >
              {auth?.currentUser?.isAnonymous ? 'アカウントを連携' : 'メールアドレスを更新'}
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
                  className={`ml-4 bg-yellow-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-yellow-600 transition-all duration-300 transform hover:scale-105
                    ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'hover:bg-yellow-600'}`}
                  disabled={isSaving}
                >
                  認証メールを再送信
                </button>
              )}
            </div>
          </div>

          {/* パスワード変更セクション */}
          <div className="mb-6">
            {isPasswordChanging ? (
              <>
                <h3 className="text-xl font-bold mb-4 text-blue-300">パスワード変更</h3>
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
                      disabled={isSaving}
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
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-1 pr-10"
                      placeholder="8文字以上のパスワード"
                      disabled={isSaving}
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
                      disabled={isSaving}
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
        </div>
      )}

      {/* StoreSettingsSectionコンポーネントをレンダリング */}
      <StoreSettingsSection
        db={db}
        appId={appId}
        userId={userId}
        setModal={setModal}
        setToast={setToast}
        isStoreMode={isStoreMode}
        setIsStoreMode={setIsStoreMode}
        storeLogo={storeLogo}
        handleStoreLogoUpload={handleStoreLogoUpload}
        isAnonymousUser={appIsAnonymousUser}
      />

      {/* 戻るボタン */}
      <div className="mt-8 text-center">
        <button
          onClick={() => setScreen('account')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-8 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
        >
          アカウント画面に戻る
        </button>
      </div>
    </div>
  );
};

export default ProfileDetailsScreen;
