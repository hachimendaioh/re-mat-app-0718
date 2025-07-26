// src/screens/AccountScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
<<<<<<< HEAD
import { signOut, signInAnonymously } from 'firebase/auth'; // signOut, signInAnonymously を直接インポート
import LoadingSpinner from '../components/common/LoadingSpinner';

// 新しく分割したセクションコンポーネントをインポート
=======
import { signOut, signInAnonymously } from 'firebase/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';

// 分割したセクションコンポーネントをインポート
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
import UserProfileSection from './UserProfileSection';
import AuthManagementSection from './AuthManagementSection';
import StoreSettingsSection from './StoreSettingsSection';

const AccountScreen = ({
  profileImage,
  handleProfileImageUpload,
  isStoreMode,
  setIsStoreMode,
  storeLogo,
  handleStoreLogoUpload,
  db,
  userId,
  appId,
  setModal,
  auth,
  setScreen,
  setToast,
<<<<<<< HEAD
  userName, // App.jsから受け取るuserName
  setUserName // App.jsから受け取るsetUserName
=======
  userName,
  setUserName
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
}) => {
  const [userEmail, setUserEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isAccountLoading, setIsAccountLoading] = useState(true);
  const [isAnonymousUser, setIsAnonymousUser] = useState(false);

  // ユーザープロフィールをFirestoreから取得する関数
  const fetchUserProfile = useCallback(async () => {
    if (!db || !userId || !auth || !auth.currentUser) {
      setIsAccountLoading(false);
      return;
    }

    setIsAccountLoading(true);
    setIsAnonymousUser(auth.currentUser.isAnonymous);

    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      const docSnap = await getDoc(userProfileRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserName(data.name || ''); // App.jsのuserName stateを更新
        setUserEmail(auth.currentUser.email || data.email || '');
<<<<<<< HEAD
        // isStoreModeもここで読み込む (App.jsのisStoreModeを更新)
        if (typeof data.isStore === 'boolean') {
          setIsStoreMode(data.isStore);
        }
        // UserProfileSectionに渡すためのstateを更新
        // phoneNumber, zipCode, prefecture, city, streetAddress, buildingName
        // これらはUserProfileSection内で管理されるため、AccountScreenでは直接管理しない
        // fetchUserProfileの目的は、App.jsの主要なstate（userName, isStoreModeなど）を同期することに絞る
      } else {
        // プロフィールが存在しない場合は初期データで作成
=======
        if (typeof data.isStore === 'boolean') {
          setIsStoreMode(data.isStore);
        }
      } else {
        // プロフィールが存在しない場合は初期データで作成 (App.jsのuseAppInitで既に処理されているが念のため)
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
        await setDoc(userProfileRef, {
          name: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
          balance: 0,
          points: 0,
          profileImageUrl: '',
          phoneNumber: '',
          address: {
            zipCode: '',
            prefecture: '',
            city: '',
            streetAddress: '',
            buildingName: ''
          },
<<<<<<< HEAD
          isStore: false, // 新規作成時にisStoreフィールドを追加
=======
          isStore: false,
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
          createdAt: serverTimestamp()
        });
        setUserName(auth.currentUser.displayName || '');
        setUserEmail(auth.currentUser.email || '');
<<<<<<< HEAD
        setIsStoreMode(false); // 新規作成時は店舗モードをfalseに設定
=======
        setIsStoreMode(false);
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
      }
      setIsEmailVerified(auth.currentUser.emailVerified);

    } catch (error) {
      console.error("Error fetching user profile:", error);
      const errorMessage = `ユーザープロフィールの読み込み中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`;
      setModal({
        isOpen: true,
        title: 'エラー',
        message: errorMessage,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsAccountLoading(false);
    }
  }, [db, userId, appId, setModal, auth, setIsStoreMode, setUserName]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // ログアウトハンドラ
  const handleLogout = useCallback(async () => {
    setModal({
      isOpen: true,
      title: 'ログアウト確認',
      message: 'ログアウトしますか？\nゲストユーザーとして続行する場合は、残高やポイントは保存されません。',
      showCancelButton: true,
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
<<<<<<< HEAD
        setIsAccountLoading(true); // AccountScreen全体のローディングを開始
        try {
          await signOut(auth);
          await signInAnonymously(auth); // ログアウト後、匿名ユーザーとして再ログイン
          setScreen('guest_intro'); // ゲスト紹介画面へ遷移
=======
        setIsAccountLoading(true);
        try {
          await signOut(auth);
          await signInAnonymously(auth);
          setScreen('guest_intro');
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
          setToast({ message: 'ログアウトしました。', type: 'success' });
        } catch (error) {
          console.error("Logout failed:", error);
          setModal({
            isOpen: true,
            title: 'ログアウト失敗',
            message: `ログアウト処理中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`,
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
          setToast({ message: `ログアウト失敗: ${error.message || '不明なエラー'}`, type: 'error' });
        } finally {
          setIsAccountLoading(false); // AccountScreen全体のローディングを終了
        }
      },
      onCancel: () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        setToast({ message: 'ログアウトがキャンセルされました。', type: 'info' });
      }
    });
  }, [auth, setScreen, setModal, setToast]);

  return (
<<<<<<< HEAD
    <div className="p-4 text-white animate-fade-in font-inter">
      <h2 className="text-3xl font-bold mb-6 text-center text-yellow-300">アカウント</h2>
=======
    <div className="p-4 text-white animate-fade-in font-inter min-h-screen bg-gradient-to-br from-[#1A032E] to-[#3A0F5B]">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">アカウント</h2>
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421

      {isAccountLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {isAnonymousUser && (
            <div className="mb-6 p-4 bg-gray-800 rounded-2xl shadow-xl text-center animate-bounce-in">
              <p className="font-bold text-lg mb-2 text-yellow-300">💡 ゲストユーザーです</p>
              <p className="text-sm text-gray-300">
                残高やポイントを保存し、全ての機能をご利用いただくには、<br/>
                アカウント登録またはログインが必要です。
              </p>
              <button
                onClick={() => setScreen('register')}
                // SWCアプリのボタンのようなグラデーションと角丸に調整
                className="mt-4 bg-gradient-to-r from-[#FF007F] to-[#CC00CC] text-white px-6 py-3 rounded-full text-md font-semibold shadow-lg hover:from-[#CC00CC] hover:to-[#FF007F] transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                アカウントを登録して連携する
              </button>
            </div>
          )}

<<<<<<< HEAD
          {/* プロフィールセクション */}
          <UserProfileSection
            profileImage={profileImage}
            handleProfileImageUpload={handleProfileImageUpload}
            db={db}
            userId={userId}
            appId={appId}
            setModal={setModal}
            setToast={setToast}
            userName={userName}
            setUserName={setUserName}
            isAnonymousUser={isAnonymousUser}
            // UserProfileSection内で管理されるstateはここで渡さない
            // phoneNumber, zipCode, prefecture, city, streetAddress, buildingName
            // fetchUserProfileを渡して、UserProfileSection内でプロフィール情報を再フェッチさせる
            fetchUserProfile={fetchUserProfile} // プロフィール保存後に全体を再フェッチさせるため
          />

          {/* 認証管理セクション */}
          {!isAnonymousUser && ( // 匿名ユーザーの場合は表示しない
            <AuthManagementSection
              auth={auth}
=======
          <div className="mb-6 p-4 bg-gray-800 rounded-2xl shadow-xl">
            <UserProfileSection
              profileImage={profileImage}
              handleProfileImageUpload={handleProfileImageUpload}
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
              db={db}
              userId={userId}
              appId={appId}
              setModal={setModal}
              setToast={setToast}
<<<<<<< HEAD
              isAnonymousUser={isAnonymousUser}
              setIsAnonymousUser={setIsAnonymousUser}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              isEmailVerified={isEmailVerified}
              setIsEmailVerified={setIsEmailVerified}
              setScreen={setScreen}
            />
          )}

          {/* 店舗設定セクション */}
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
            isAnonymousUser={isAnonymousUser}
          />

          {/* ログアウトボタン */}
          <div className="mt-8 text-center animate-fade-in-up">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
=======
              userName={userName}
              setUserName={setUserName}
              isAnonymousUser={isAnonymousUser}
              isEmailVerified={isEmailVerified}
              setScreen={setScreen}
            />
          </div>

          {!isAnonymousUser && (
            <div className="mb-6 p-4 bg-gray-800 rounded-2xl shadow-xl">
              <AuthManagementSection
                auth={auth}
                db={db}
                userId={userId}
                appId={appId}
                setModal={setModal}
                setToast={setToast}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                isEmailVerified={isEmailVerified}
                setIsEmailVerified={setIsEmailVerified}
                setScreen={setScreen}
              />
            </div>
          )}

          <div className="mb-6 p-4 bg-gray-800 rounded-2xl shadow-xl">
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
              isAnonymousUser={isAnonymousUser}
              setScreen={setScreen}
            />
          </div>

          <div className="mt-8 text-center animate-fade-in-up">
            <button
              onClick={handleLogout}
              // SWCアプリのボタンのようなグラデーションと角丸に調整
              className="bg-gradient-to-r from-[#FF007F] to-[#CC00CC] text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:from-[#CC00CC] hover:to-[#FF007F] transition-all duration-300 transform hover:scale-105 active:scale-95"
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
            >
              ログアウト
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountScreen;
