// src/screens/ProfileImageEditSection.js

import React, { useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProfileImageEditSection = ({
  profileImage, // App.jsから渡される現在のプロフィール画像URL
  handleProfileImageUpload, // App.jsのprofileImage stateを更新する関数
  db,
  userId,
  appId,
  setModal,
  setToast,
  isAnonymousUser, // 匿名ユーザーかどうか
  isSaving // 親コンポーネントの保存中のローディング状態
}) => {

  // プロフィール画像アップロードハンドラ
  const handleLocalProfileImageUpload = useCallback(async (event) => {
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

    // isSaving を親から受け取っているが、ここでは自身のローディング状態として扱う
    // または、親のisSavingを更新する関数を渡すこともできるが、今回はこのセクション内で完結させる
    setModal({
      isOpen: true,
      title: 'プロフィール画像を更新中',
      message: '画像をアップロードしています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

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
        setToast({ message: `プロフィール画像の更新に失敗しました: ${error.message || error.toString()}`, type: 'error' });
    } finally {
        setModal(prev => ({ ...prev, isOpen: false })); // モーダルを閉じる
    }
  }, [appId, db, handleProfileImageUpload, isAnonymousUser, setModal, setToast, userId]);


  return (
    <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center">
      <h3 className="text-xl font-bold mb-4 text-blue-300">プロフィール写真</h3>
      <div className="w-28 h-28 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden mb-4 border-4 border-blue-400 shadow-inner">
        {profileImage ? (
          <img src={profileImage} alt="プロフィール" className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">👤</span>
        )}
      </div>
      <input
        type="file"
        id="profileImageUploadDetail" // IDをユニークにするため変更 (コメントを削除)
        accept="image/*"
        onChange={handleLocalProfileImageUpload}
        className="hidden"
        disabled={isAnonymousUser || isSaving}
      />
      <button
        onClick={() => document.getElementById('profileImageUploadDetail').click()}
        className={`px-5 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105
          ${isAnonymousUser || isSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        disabled={isAnonymousUser || isSaving}
      >
        プロフィール画像を更新
      </button>
    </div>
  );
};

export default ProfileImageEditSection;
