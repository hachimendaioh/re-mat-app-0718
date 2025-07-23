// src/screens/UserProfileSection.js

import React, { useState, useCallback, useEffect } from 'react';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserProfileSection = ({
  profileImage,
  handleProfileImageUpload, // App.jsのstateを更新するための関数
  db,
  userId,
  appId,
  setModal,
  setToast,
  userName, // App.jsから受け取るuserName
  setUserName, // App.jsのsetUserName (App.jsのuserName stateを更新する関数)
  isAnonymousUser, // 匿名ユーザーかどうか
  isEmailVerified, // メール認証ステータス
  setScreen // 画面遷移用
}) => {
  const [isEditingName, setIsEditingName] = useState(false); // ユーザー名編集モード用
  const [tempUserName, setTempUserName] = useState(userName); // ユーザー名編集用の一時state
  const [isSavingProfile, setIsSavingProfile] = useState(false); // プロフィール全体の保存ローディング

  // 親コンポーネントからのuserName変更を同期
  useEffect(() => {
    setTempUserName(userName);
  }, [userName]);

  // プロフィールデータをFirestoreから読み込む関数 (名前のみをフェッチ)
  const fetchProfileData = useCallback(async () => {
    if (!db || !userId) return;

    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      const docSnap = await getDoc(userProfileRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setTempUserName(data.name || ''); // 読み込んだ名前を一時stateにセット
        setUserName(data.name || ''); // App.jsのuserNameもここで更新
      } else {
        // プロフィールが存在しない場合は初期データで作成 (念のため、App.jsのuseAppInitで既に処理されているはず)
        await setDoc(userProfileRef, {
          name: '',
          email: '',
          balance: 0,
          points: 0,
          profileImageUrl: '',
          phoneNumber: '',
          address: { zipCode: '', prefecture: '', city: '', streetAddress: '', buildingName: '' },
          isStore: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("UserProfileSection: Error fetching profile data:", error);
      setToast({ message: `プロフィールの読み込みに失敗しました: ${error.message}`, type: 'error' });
    }
  }, [db, userId, appId, setToast, setUserName]);

  // コンポーネントマウント時にプロフィールデータをフェッチ
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);


  // プロフィール画像アップロードハンドラ
  const handleLocalProfileImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (isAnonymousUser) {
        setModal({
            isOpen: true,
            title: '機能制限',
            message: 'プロフィール画像を更新するには、アカウント登録またはログインが必要です。',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
        });
        return;
    }

    setToast({ message: 'プロフィール画像をアップロード中...', type: 'info' });
    setIsSavingProfile(true); // ローディング開始
    try {
        const storage = getStorage();
        const storageRef = ref(storage, `artifacts/${appId}/users/${userId}/profileImages/profile.jpg`);

        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);

        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        await updateDoc(userProfileRef, { profileImageUrl: imageUrl });
        
        if (handleProfileImageUpload && typeof handleProfileImageUpload === 'function') {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleProfileImageUpload(reader.result); // App.jsのstateを更新
            };
            reader.readAsDataURL(file);
        }

        setToast({ message: 'プロフィール画像を更新しました！', type: 'success' });

    } catch (error) {
        console.error("Error uploading profile image:", error);
        setToast({
            message: `プロフィール画像の更新に失敗しました。\n詳細: ${error.message || error.toString()}`,
            type: 'error',
        });
    } finally {
        setIsSavingProfile(false); // ローディング終了
    }
  };

  // ユーザー名のみを保存するハンドラ
  const handleSaveProfile = useCallback(async () => {
    console.log("handleSaveProfile: 保存処理を開始します。");

    if (!tempUserName.trim()) {
      setToast({ message: 'ユーザー名を入力してください。', type: 'error' });
      console.log("handleSaveProfile: ユーザー名が未入力です。");
      return;
    }

    if (isAnonymousUser) {
      setModal({
        isOpen: true,
        title: '機能制限',
        message: 'プロフィールを保存するには、アカウント登録またはログインが必要です。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      console.log("handleSaveProfile: 匿名ユーザーのため保存を中断します。");
      return;
    }

    setIsSavingProfile(true); // ローディング開始
    setModal({
      isOpen: true,
      title: 'プロフィールを保存中',
      message: 'プロフィール情報を更新しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });
    console.log("handleSaveProfile: 保存モーダルを表示しました。");

    try {
      console.log("handleSaveProfile: Firestoreへの更新を開始します。");
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(userProfileRef, {
        name: tempUserName.trim(),
      });
      setUserName(tempUserName.trim()); // App.jsのuserName stateを更新
      setToast({ message: 'プロフィール情報を保存しました！', type: 'success' });
      setIsEditingName(false); // ユーザー名編集モードを終了
      console.log("handleSaveProfile: プロフィール情報を正常に保存しました。");
    } catch (error) {
      console.error("handleSaveProfile: Error saving user profile:", error);
      setToast({
          message: `プロフィールの保存中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`,
          type: 'error',
      });
    } finally {
      setModal(prev => ({ ...prev, isOpen: false }));
      setIsSavingProfile(false); // ローディング終了
      console.log("handleSaveProfile: 保存処理を終了しました。");
    }
  }, [tempUserName, userName, setUserName, setToast, db, appId, userId, isAnonymousUser, setModal]);


  return (
    <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center animate-slide-in-right">
      <h3 className="text-xl font-bold mb-4 text-blue-300">プロフィール</h3>

      {/* プロフィール画像セクション */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-28 h-28 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden mb-4 border-4 border-blue-400 shadow-inner">
          {profileImage ? (
            <img src={profileImage} alt="プロフィール" className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">👤</span>
          )}
        </div>
        <input
          type="file"
          id="profileImageUpload"
          accept="image/*"
          onChange={handleLocalProfileImageUpload}
          className="hidden"
          disabled={isAnonymousUser || isSavingProfile}
        />
        <button
          onClick={() => document.getElementById('profileImageUpload').click()}
          className={`px-5 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105
            ${isAnonymousUser || isSavingProfile ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          disabled={isAnonymousUser || isSavingProfile}
        >
          プロフィール画像を更新
        </button>
      </div>

      {/* ユーザー名 */}
      <div className="mt-6 mb-4 w-full text-center">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="userName">
          名前
        </label>
        {isEditingName ? (
          <div className="flex items-center justify-center space-x-2">
            <input
              type="text"
              id="userName"
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              className="shadow appearance-none border rounded-lg py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 w-3/4"
              placeholder="名前を入力してください"
              disabled={isAnonymousUser || isSavingProfile}
            />
            <button
              onClick={handleSaveProfile}
              className={`bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105
                ${isAnonymousUser || isSavingProfile ? 'bg-gray-500 cursor-not-allowed' : 'hover:bg-green-600'}`}
              disabled={isAnonymousUser || isSavingProfile}
            >
              {isSavingProfile ? <LoadingSpinner size="sm" /> : '保存'}
            </button>
            <button
              onClick={() => { setIsEditingName(false); setTempUserName(userName); }}
              className="bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
              disabled={isSavingProfile}
            >
              X
            </button>
          </div>
        ) : (
          <p className="text-2xl font-bold mb-2">
            {userName || '未設定'}
            <button onClick={() => setIsEditingName(true)} className="ml-2 text-blue-400 text-sm">編集</button>
          </p>
        )}
      </div>

      {/* 認証ステータス */}
      <div className="mt-6 mb-4 text-center w-full">
        <p className="text-gray-400 text-sm">
          ユーザーID: {userId}
        </p>
        {!isAnonymousUser && (
          <p className={`text-lg font-bold ${isEmailVerified ? 'text-green-400' : 'text-red-400'} mt-2`}>
            {isEmailVerified ? '✅ メール認証済み' : '❌ メール未認証'}
          </p>
        )}
      </div>

      {/* 詳細ボタン (AccountScreenから遷移する場合のみ表示) */}
      {setScreen && ( // setScreen propがある場合のみ表示
        <button
          onClick={() => setScreen('profile_details')} // 新しい画面への遷移
          className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95"
        >
          詳細を見る・編集する
        </button>
      )}
    </div>
  );
};

export default UserProfileSection;
