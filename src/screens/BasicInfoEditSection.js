// src/screens/BasicInfoEditSection.js

import React, { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import LoadingSpinner from '../components/common/LoadingSpinner';

const BasicInfoEditSection = ({
  db,
  userId,
  appId,
  setModal,
  setToast,
  userName: appUserName, // App.jsのuserName (現在の値)
  setUserName: setAppUserName, // App.jsのsetUserName (App.jsのuserName stateを更新する関数)
  isAnonymousUser, // 匿名ユーザーかどうか
  isSaving, // 親コンポーネントの保存中のローディング状態
  setIsSaving // 親コンポーネントのisSavingを更新する関数
}) => {
  const [localUserName, setLocalUserName] = useState(appUserName);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [buildingName, setBuildingName] = useState('');

  // 親コンポーネントからのuserName変更を同期
  useEffect(() => {
    setLocalUserName(appUserName);
  }, [appUserName]);

  // プロフィールデータをFirestoreから読み込む関数 (名前、電話番号、住所)
  const fetchProfileData = useCallback(async () => {
    if (!db || !userId) return;

    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      const docSnap = await getDoc(userProfileRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocalUserName(data.name || '');
        setPhoneNumber(data.phoneNumber || '');
        setZipCode(data.address?.zipCode || '');
        setPrefecture(data.address?.prefecture || '');
        setCity(data.address?.city || '');
        setStreetAddress(data.address?.streetAddress || '');
        setBuildingName(data.address?.buildingName || '');
        setAppUserName(data.name || ''); // App.jsのuserNameもここで更新
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
      console.error("BasicInfoEditSection: Error fetching profile data:", error);
      setToast({ message: `基本情報の読み込みに失敗しました: ${error.message}`, type: 'error' });
    }
  }, [db, userId, appId, setToast, setAppUserName]);

  useEffect(() => {
    // 匿名ユーザーの場合はデータをフェッチしない
    if (!isAnonymousUser) {
      fetchProfileData();
    }
  }, [fetchProfileData, isAnonymousUser]);


  // プロフィール情報保存ハンドラ (名前、電話番号、住所)
  const handleSaveProfile = useCallback(async () => {
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

    setIsSaving(true); // 親のisSavingを更新
    setModal({
      isOpen: true,
      title: 'プロフィールを保存中',
      message: 'プロフィール情報を更新しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(userProfileRef, {
        name: localUserName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: {
          zipCode: zipCode.trim(),
          prefecture: prefecture.trim(),
          city: city.trim(),
          streetAddress: streetAddress.trim(),
          buildingName: buildingName.trim()
        }
      });
      setAppUserName(localUserName.trim()); // App.jsのuserName stateも更新
      setToast({ message: 'プロフィール情報を保存しました！', type: 'success' });
    } catch (error) {
      console.error("Error saving user profile:", error);
      setToast({
          message: `プロフィールの保存中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`,
          type: 'error',
      });
    } finally {
      setModal(prev => ({ ...prev, isOpen: false }));
      setIsSaving(false); // 親のisSavingを更新
    }
  }, [db, userId, appId, localUserName, phoneNumber, zipCode, prefecture, city, streetAddress, buildingName, setModal, setToast, setAppUserName, isAnonymousUser, setIsSaving]);


  return (
    <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-blue-300">基本情報</h3>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="localUserName">
          名前
        </label>
        <input
          type="text"
          id="localUserName"
          value={localUserName}
          onChange={(e) => setLocalUserName(e.target.value)}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
          placeholder="名前を入力してください"
          disabled={isAnonymousUser || isSaving}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="phoneNumber">
          電話番号
        </label>
        <input
          type="tel"
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
          placeholder="例: 09012345678"
          disabled={isAnonymousUser || isSaving}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="zipCode">
          郵便番号
        </label>
        <input
          type="text"
          id="zipCode"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
          placeholder="例: 123-4567"
          disabled={isAnonymousUser || isSaving}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="prefecture">
          都道府県
        </label>
        <input
          type="text"
          id="prefecture"
          value={prefecture}
          onChange={(e) => setPrefecture(e.target.value)}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
          placeholder="例: 東京都"
          disabled={isAnonymousUser || isSaving}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="city">
          市区町村
        </label>
        <input
          type="text"
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
          placeholder="例: 渋谷区"
          disabled={isAnonymousUser || isSaving}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="streetAddress">
          番地
        </label>
        <input
          type="text"
          id="streetAddress"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
          placeholder="例: 1-2-3"
          disabled={isAnonymousUser || isSaving}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="buildingName">
          建物名・部屋番号 (任意)
        </label>
        <input
          type="text"
          id="buildingName"
          value={buildingName}
          onChange={(e) => setBuildingName(e.target.value)}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
          placeholder="例: RE-Matビル 101号室"
          disabled={isAnonymousUser || isSaving}
        />
      </div>
      <button
        onClick={handleSaveProfile}
        className={`mt-6 bg-green-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105 w-full
          ${isAnonymousUser || isSaving ? 'bg-gray-500 cursor-not-allowed' : 'hover:bg-green-600'}`}
        disabled={isAnonymousUser || isSaving}
      >
        {isSaving ? <LoadingSpinner size="sm" /> : '情報を保存'}
      </button>
    </div>
  );
};

export default BasicInfoEditSection;
