// src/screens/UserProfileSection.js

import React, { useState, useCallback, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserProfileSection = ({
  profileImage,
  handleProfileImageUpload,
  db,
  userId,
  appId,
  setModal,
  setToast,
  userName,
  setUserName,
  isAnonymousUser, // 匿名ユーザーかどうか
  fetchUserProfile // 親からプロファイル再フェッチ関数を受け取る (キャンセル時に使用)
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [tempUserName, setTempUserName] = useState(userName);

  // 住所関連のstateはUserProfileSection内で管理
  const [phoneNumber, setPhoneNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [buildingName, setBuildingName] = useState('');

  // 親コンポーネントからのuserName変更を同期
  useEffect(() => {
    setTempUserName(userName);
  }, [userName]);

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

    setIsAccountLoading(true);

    try {
        const storage = getStorage();
        const storageRef = ref(storage, `artifacts/${appId}/users/${userId}/profileImages/profile.jpg`);

        await uploadBytes(storageRef, file);

        const imageUrl = await getDownloadURL(storageRef);

        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        await updateDoc(userProfileRef, {
            profileImageUrl: imageUrl
        });
        
        if (handleProfileImageUpload && typeof handleProfileImageUpload === 'function') {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleProfileImageUpload(reader.result);
            };
            reader.readAsDataURL(file);
        }

        setToast({
            message: 'プロフィール画像を更新しました。',
            type: 'success',
        });

    } catch (error) {
        console.error("Error uploading profile image:", error);
        setToast({
            message: `プロフィール画像の更新に失敗しました。\n詳細: ${error.message || error.toString()}`,
            type: 'error',
        });
    } finally {
        setIsAccountLoading(false);
    }
  };

  // ユーザー名更新ハンドラ（Firestoreに直接書き込み、App.jsのstateも更新）
  const handleUpdateUserName = useCallback(async () => {
    if (!tempUserName.trim()) {
      setToast({ message: 'ユーザー名を入力してください。', type: 'error' });
      return;
    }
    if (tempUserName === userName) {
      setIsEditing(false); 
      return;
    }

    setIsAccountLoading(true);
    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(userProfileRef, { name: tempUserName.trim() });
      setUserName(tempUserName.trim());
      setToast({ message: 'ユーザー名を更新しました！', type: 'success' });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user name:", error);
      setToast({ message: `ユーザー名の更新に失敗しました: ${error.message}`, type: 'error' });
    } finally {
      setIsAccountLoading(false);
    }
  }, [tempUserName, userName, setUserName, setToast, db, appId, userId]);

  // プロフィール情報保存ハンドラ（住所、電話番号など）
  const handleSaveProfile = async () => {
    if (isAnonymousUser) {
      setModal({
        isOpen: true,
        title: '機能制限',
        message: 'プロフィールを保存するには、アカウント登録またはログインが必要です。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    if (!db || !userId) {
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'サービスが利用できません。時間をおいて再度お試しください。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }

    setIsAccountLoading(true);
    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(userProfileRef, {
        phoneNumber: phoneNumber,
        address: {
          zipCode: zipCode,
          prefecture: prefecture,
          city: city,
          streetAddress: streetAddress,
          buildingName: buildingName
        }
      });
      setIsEditing(false);
      setToast({
        message: 'プロフィール情報を保存しました。',
        type: 'success',
      });
    } catch (error) {
      console.error("Error saving user profile:", error);
      setToast({
          message: `プロフィールの保存中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`,
          type: 'error',
      });
    } finally {
      setIsAccountLoading(false);
    }
  };

  // UserProfileSection内で自身のプロフィールデータを取得するロジック
  useEffect(() => {
    const fetchLocalProfileData = async () => {
      // ★修正: 匿名ユーザーの場合はFirestoreからの読み込みをスキップ ★
      if (!db || !userId || isAnonymousUser) {
        if (isAnonymousUser) {
          console.log("UserProfileSection: Anonymous user. Skipping local profile data fetch.");
          // 匿名ユーザーの場合、表示は「未設定」となる
          setPhoneNumber('');
          setZipCode('');
          setPrefecture('');
          setCity('');
          setStreetAddress('');
          setBuildingName('');
        }
        return;
      }

      try {
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhoneNumber(data.phoneNumber || '');
          setZipCode(data.address?.zipCode || '');
          setPrefecture(data.address?.prefecture || '');
          setCity(data.address?.city || '');
          setStreetAddress(data.address?.streetAddress || '');
          setBuildingName(data.address?.buildingName || '');
        } else {
          // ドキュメントが存在しない場合も初期化
          setPhoneNumber('');
          setZipCode('');
          setPrefecture('');
          setCity('');
          setStreetAddress('');
          setBuildingName('');
        }
      } catch (error) {
        console.error("Error fetching local profile data in UserProfileSection:", error);
        // エラーが発生した場合も、UIをクリアするなどの対応
        setPhoneNumber('');
        setZipCode('');
        setPrefecture('');
        setCity('');
        setStreetAddress('');
        setBuildingName('');
        setToast({ message: `プロフィール詳細の読み込みに失敗しました: ${error.message}`, type: 'error' });
      }
    };
    fetchLocalProfileData();
  }, [db, userId, appId, isAnonymousUser, setToast]); // isAnonymousUserを依存配列に追加


  return (
    <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-right">
      <h3 className="text-xl font-bold mb-4 text-blue-300">プロフィール</h3>
      {isAccountLoading && <LoadingSpinner />}

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
          disabled={isAnonymousUser}
        />
        <button
          onClick={() => document.getElementById('profileImageUpload').click()}
          className={`px-5 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105
            ${isAnonymousUser ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          disabled={isAnonymousUser}
        >
          プロフィール画像を更新
        </button>
      </div>

      {/* ユーザー名 */}
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="userName">
          名前
        </label>
        {isEditing ? (
          <input
            type="text"
            id="userName"
            value={tempUserName}
            onChange={(e) => setTempUserName(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
            placeholder="名前を入力してください"
          />
        ) : (
          <p className="text-white text-lg">{userName || '未設定'}</p>
        )}
      </div>

      {/* 電話番号入力欄 */}
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="phoneNumber">
          電話番号
        </label>
        {isEditing ? (
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
            placeholder="例: 09012345678"
          />
        ) : (
          <p className="text-white text-lg">{phoneNumber || '未設定'}</p>
        )}
      </div>

      {/* 住所入力欄 */}
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="zipCode">
          郵便番号
        </label>
        {isEditing ? (
          <input
            type="text"
            id="zipCode"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
            placeholder="例: 123-4567"
          />
        ) : (
          <p className="text-white text-lg">{zipCode || '未設定'}</p>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="prefecture">
          都道府県
        </label>
        {isEditing ? (
          <input
            type="text"
            id="prefecture"
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
            placeholder="例: 東京都"
          />
        ) : (
          <p className="text-white text-lg">{prefecture || '未設定'}</p>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="city">
          市区町村
        </label>
        {isEditing ? (
          <input
            type="text"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
            placeholder="例: 渋谷区"
          />
        ) : (
          <p className="text-white text-lg">{city || '未設定'}</p>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="streetAddress">
          番地
        </label>
        {isEditing ? (
          <input
            type="text"
            id="streetAddress"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
            placeholder="例: 1-2-3"
          />
        ) : (
          <p className="text-white text-lg">{streetAddress || '未設定'}</p>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="buildingName">
          建物名・部屋番号 (任意)
        </label>
        {isEditing ? (
          <input
            type="text"
            id="buildingName"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
            placeholder="例: RE-Matビル 101号室"
          />
        ) : (
          <p className="text-white text-lg">{buildingName || '未設定'}</p>
        )}
      </div>
      {/* 保存/キャンセルボタン */}
      <div className="flex justify-end mt-6">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                setIsEditing(false);
                setTempUserName(userName); // ユーザー名を元の値に戻す
                fetchUserProfile(); // 住所などのローカルstateをリセットするため、親のfetchUserProfileを呼び出す
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 mr-2"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveProfile}
              className="bg-green-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
            >
              保存
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
          >
            編集
          </button>
        )}
      </div>
    </div>
  );
};

export default UserProfileSection;
