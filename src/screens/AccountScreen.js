// src/screens/AccountScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut, signInAnonymously } from 'firebase/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';

// 分割したセクションコンポーネントをインポート
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
  userName,
  setUserName
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
        if (typeof data.isStore === 'boolean') {
          setIsStoreMode(data.isStore);
        }
      } else {
        // プロフィールが存在しない場合は初期データで作成 (App.jsのuseAppInitで既に処理されているが念のため)
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
          isStore: false,
          createdAt: serverTimestamp()
        });
        setUserName(auth.currentUser.displayName || '');
        setUserEmail(auth.currentUser.email || '');
        setIsStoreMode(false);
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
        setIsAccountLoading(true);
        try {
          await signOut(auth);
          await signInAnonymously(auth);
          setScreen('guest_intro');
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
          setIsAccountLoading(false);
        }
      },
      onCancel: () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        setToast({ message: 'ログアウトがキャンセルされました。', type: 'info' });
      }
    });
  }, [auth, setScreen, setModal, setToast]);

  return (
    <div className="p-4 text-white animate-fade-in font-inter min-h-screen bg-gradient-to-br from-[#1A032E] to-[#3A0F5B]">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">アカウント</h2>

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

          <div className="mb-6 p-4 bg-gray-800 rounded-2xl shadow-xl">
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
