// src/screens/StoreSettingsSection.js

import React, { useState, useCallback, useEffect } from 'react';
<<<<<<< HEAD
import { doc, updateDoc, getDoc } from 'firebase/firestore'; // getDocを追加
=======
import { doc, updateDoc, getDoc } from 'firebase/firestore';
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
import LoadingSpinner from '../components/common/LoadingSpinner';
import StoreMenuManager from './StoreMenuManager';

const StoreSettingsSection = ({
  db,
  appId,
  userId,
  setModal,
  setToast,
  isStoreMode,
  setIsStoreMode,
  storeLogo,
  handleStoreLogoUpload,
<<<<<<< HEAD
  isAnonymousUser // 匿名ユーザーかどうか
=======
  isAnonymousUser,
  setScreen // setScreenはここでは使用しないが、propsとして受け取るのは問題ない
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
}) => {
  const [isUpdatingStoreMode, setIsUpdatingStoreMode] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storePhoneNumber, setStorePhoneNumber] = useState('');
  const [storeZipCode, setStoreZipCode] = useState('');
  const [storePrefecture, setStorePrefecture] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeStreetAddress, setStoreStreetAddress] = useState('');
  const [storeBuildingName, setStoreBuildingName] = useState('');
  const [isStoreProfileRegistered, setIsStoreProfileRegistered] = useState(false);
  const [isSavingStoreProfile, setIsSavingStoreProfile] = useState(false);

  // 店舗プロフィールを読み込むuseEffect
  useEffect(() => {
    const fetchStoreProfile = async () => {
      if (!db || !userId) return;
      try {
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStoreName(data.storeName || '');
          setStorePhoneNumber(data.storePhoneNumber || '');
          setStoreZipCode(data.storeAddress?.zipCode || '');
          setStorePrefecture(data.storeAddress?.prefecture || '');
          setStoreCity(data.storeAddress?.city || '');
          setStoreStreetAddress(data.storeAddress?.streetAddress || '');
          setStoreBuildingName(data.storeAddress?.buildingName || '');
          // 全ての必須項目が埋まっていれば登録済みとみなす (店名、電話番号、番地)
          if (data.storeName && data.storePhoneNumber && data.storeAddress?.streetAddress) {
            setIsStoreProfileRegistered(true);
          } else {
            setIsStoreProfileRegistered(false);
          }
        }
      } catch (error) {
        console.error("StoreSettingsSection: Error fetching store profile:", error);
      }
    };
    if (isStoreMode) { // 店舗モードの場合のみフェッチ
      fetchStoreProfile();
    } else {
      setIsStoreProfileRegistered(false); // 店舗モードでない場合はリセット
    }
<<<<<<< HEAD
  }, [db, appId, userId, isStoreMode]); // isStoreModeを依存配列に追加
=======
  }, [db, appId, userId, isStoreMode]);
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421

  // isStoreModeを更新する関数
  const handleToggleStoreMode = useCallback(async () => {
    if (isAnonymousUser) {
      setModal({
        isOpen: true,
        title: '機能制限',
        message: '店舗モードを切り替えるには、アカウント登録またはログインが必要です。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return; // 匿名ユーザーの場合はここで処理を中断
    }

    if (!db || !userId) {
      setToast({ message: 'Firestoreが初期化されていません。', type: 'error' });
      return;
    }
    setIsUpdatingStoreMode(true);
    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(userProfileRef, { isStore: !isStoreMode });
      setIsStoreMode(!isStoreMode);
      setToast({ message: `店舗モードを${!isStoreMode ? '有効' : '無効'}にしました。`, type: 'success' });
      console.log(`StoreSettingsSection: Store mode toggled to ${!isStoreMode}.`);
    } catch (error) {
      console.error("StoreSettingsSection: Error toggling store mode:", error);
      setToast({ message: `店舗モードの更新に失敗しました: ${error.message}`, type: 'error' });
    } finally {
      setIsUpdatingStoreMode(false);
    }
  }, [db, appId, userId, isStoreMode, setIsStoreMode, setToast, isAnonymousUser, setModal]);

  // 店舗プロフィールを保存する関数
  const handleSaveStoreProfile = useCallback(async () => {
    if (!storeName.trim() || !storePhoneNumber.trim() || !storeStreetAddress.trim()) {
      setToast({ message: '店名、電話番号、番地は必須です。', type: 'error' });
      return;
    }

    setIsSavingStoreProfile(true);
    setModal({
      isOpen: true,
      title: '店舗情報を保存中',
      message: '店舗プロフィールを更新しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

    try {
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await updateDoc(userProfileRef, {
        storeName: storeName.trim(),
        storePhoneNumber: storePhoneNumber.trim(),
        storeAddress: {
          zipCode: storeZipCode.trim(),
          prefecture: storePrefecture.trim(),
          city: storeCity.trim(),
          streetAddress: storeStreetAddress.trim(),
          buildingName: storeBuildingName.trim()
        },
        isStoreProfileRegistered: true // 登録完了フラグを立てる
      });
      setIsStoreProfileRegistered(true);
      setToast({ message: '店舗プロフィールを保存しました！', type: 'success' });
    } catch (error) {
      console.error("StoreSettingsSection: Error saving store profile:", error);
      setToast({ message: `店舗プロフィールの保存に失敗しました: ${error.message}`, type: 'error' });
    } finally {
      setModal(prev => ({ ...prev, isOpen: false }));
      setIsSavingStoreProfile(false);
    }
  }, [db, appId, userId, storeName, storePhoneNumber, storeZipCode, storePrefecture, storeCity, storeStreetAddress, storeBuildingName, setModal, setToast]);


  return (
    <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-right">
      <h3 className="text-xl font-bold mb-4 text-blue-300">店舗設定</h3>

      {/* 店舗モード切り替え */}
<<<<<<< HEAD
      {/* ★修正: labelで全体を囲み、flex-growでテキスト部分がスペースを占有するようにする ★ */}
=======
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
      <label htmlFor="storeModeToggle" className="flex items-center justify-between mb-6 cursor-pointer">
        <span className="text-lg font-semibold flex-grow">店舗モードを有効にする</span>
        <div className="relative inline-block w-12 h-7">
          <input
            type="checkbox"
            id="storeModeToggle"
            className="opacity-0 w-0 h-0"
            checked={isStoreMode}
            onChange={handleToggleStoreMode}
            disabled={isAnonymousUser || isUpdatingStoreMode} // 匿名ユーザーまたは更新中は無効化
          />
          <span className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-400 
            ${isStoreMode ? 'bg-green-500' : 'bg-gray-600'} ${isAnonymousUser || isUpdatingStoreMode ? 'opacity-50' : ''}`}>
            <span className={`absolute content-[''] h-5 w-5 left-1 bottom-1 bg-white rounded-full transition-transform duration-400 
              ${isStoreMode ? 'transform translate-x-5' : ''}`}></span>
          </span>
          {isUpdatingStoreMode && <LoadingSpinner size="sm" className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 rounded-full" />}
        </div>
      </label>

      {isStoreMode && ( // 店舗モードが有効な場合のみ表示
        <>
          {!isStoreProfileRegistered ? ( // 店舗情報が未登録の場合
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <p className="text-yellow-300 text-lg mb-4">店舗情報を登録してください</p>
              {/* 店舗情報入力フォーム */}
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeName">店名 (必須)</label>
              <input type="text" id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: RE-Matカフェ" />

              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storePhoneNumber">電話番号 (必須)</label>
              <input type="tel" id="storePhoneNumber" value={storePhoneNumber} onChange={(e) => setStorePhoneNumber(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 03-1234-5678" />

              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeZipCode">郵便番号</label>
<<<<<<< HEAD
              <input type="text" id="storeZipCode" value={storeZipCode} onChange={(e) => setStoreZipCode(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 123-4567" />

              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storePrefecture">都道府県</label>
              <input type="text" id="storePrefecture" value={storePrefecture} onChange={(e) => setStorePrefecture(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 東京都" />

              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeCity">市区町村</label>
              <input type="text" id="storeCity" value={storeCity} onChange={(e) => setStoreCity(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 渋谷区" />
              
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeStreetAddress">番地 (必須)</label>
              <input type="text" id="storeStreetAddress" value={storeStreetAddress} onChange={(e) => setStoreStreetAddress(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 1-2-3" />
              
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeBuildingName">建物名・部屋番号 (任意)</label>
              <input type="text" id="storeBuildingName" value={storeBuildingName} onChange={(e) => setStoreBuildingName(e.target.value)}
=======
              <input type="text" id="storeZipCode" value={storeZipCode} onChange={(e) => setZipCode(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 123-4567" />

              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storePrefecture">都道府県</label>
              <input type="text" id="storePrefecture" value={storePrefecture} onChange={(e) => setPrefecture(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 東京都" />

              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeCity">市区町村</label>
              <input type="text" id="storeCity" value={storeCity} onChange={(e) => setCity(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 渋谷区" />
              
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeStreetAddress">番地 (必須)</label>
              <input type="text" id="storeStreetAddress" value={storeStreetAddress} onChange={(e) => setStreetAddress(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: 1-2-3" />
              
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="storeBuildingName">建物名・部屋番号 (任意)</label>
              <input type="text" id="storeBuildingName" value={storeBuildingName} onChange={(e) => setBuildingName(e.target.value)}
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 bg-gray-100" placeholder="例: RE-Matビル 101号室" />

              <button
                onClick={handleSaveStoreProfile}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-full font-semibold shadow-md transition-all duration-300 w-full"
                disabled={isSavingStoreProfile}
              >
                {isSavingStoreProfile ? <LoadingSpinner size="sm" /> : '店舗情報を登録'}
              </button>
<<<<<<< HEAD
=======
              {/* ★削除: アカウント画面へ戻るボタンを削除 ★ */}
              {/* <button
                onClick={() => setScreen('account')}
                className="mt-4 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-full font-semibold shadow-md transition-all duration-300 w-full"
              >
                アカウント画面へ戻る
              </button> */}
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
            </div>
          ) : ( // 店舗情報が登録済みの場合
            <>
              <h4 className="text-xl font-bold mb-3 text-gray-300">店舗情報</h4>
              <p className="text-lg text-gray-200">店名: {storeName}</p>
              <p className="text-base text-gray-400">電話: {storePhoneNumber}</p>
              <p className="text-base text-gray-400">住所: {`${storePrefecture} ${storeCity} ${storeStreetAddress} ${storeBuildingName}`.trim()}</p>
              <button
                onClick={() => setIsStoreProfileRegistered(false)} // 編集モードに入る
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-blue-600 transition-all duration-300"
              >
                店舗情報を編集
              </button>
              
              {/* 店舗ロゴセクション */}
              <div className="mt-6 mb-6">
                <h4 className="text-lg font-semibold mb-2">店舗ロゴ</h4>
                <div className="w-28 h-28 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden mb-4 border-4 border-blue-400 shadow-inner">
                  {storeLogo ? (
                    <img src={storeLogo} alt="店舗ロゴ" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">🏢</span>
                  )}
                </div>
                <input
                  type="file"
                  id="storeLogoUpload"
                  accept="image/*"
                  onChange={handleStoreLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById('storeLogoUpload').click()}
                  className="px-5 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105 bg-blue-500 text-white hover:bg-blue-600"
                >
                  店舗ロゴを更新
                </button>
              </div>

              {/* メニュー管理コンポーネント */}
              <div className="mt-8">
                <StoreMenuManager 
                  db={db} 
                  appId={appId} 
                  userId={userId} 
                  setModal={setModal} 
                  setToast={setToast} 
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StoreSettingsSection;
