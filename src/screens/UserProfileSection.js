// src/screens/UserProfileSection.js

import React, { useState, useCallback, useEffect } from 'react';
<<<<<<< HEAD
import { doc, updateDoc, getDoc } from 'firebase/firestore';
=======
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserProfileSection = ({
  profileImage,
<<<<<<< HEAD
  handleProfileImageUpload,
=======
  handleProfileImageUpload, // App.jsのstateを更新するための関数
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
  db,
  userId,
  appId,
  setModal,
  setToast,
<<<<<<< HEAD
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
=======
  userName, // App.jsから受け取るuserName
  setUserName, // App.jsのsetUserName (App.jsのuserName stateを更新する関数)
  isAnonymousUser, // 匿名ユーザーかどうか
  isEmailVerified, // メール認証ステータス
  setScreen // 画面遷移用
}) => {
  const [isEditingName, setIsEditingName] = useState(false); // ユーザー名編集モード用
  const [tempUserName, setTempUserName] = useState(userName); // ユーザー名編集用の一時state
  const [isSavingProfile, setIsSavingProfile] = useState(false); // プロフィール全体の保存ローディング
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421

  // 親コンポーネントからのuserName変更を同期
  useEffect(() => {
    setTempUserName(userName);
  }, [userName]);

<<<<<<< HEAD
=======
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


>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
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

<<<<<<< HEAD
    setIsAccountLoading(true);

=======
    setToast({ message: 'プロフィール画像をアップロード中...', type: 'info' });
    setIsSavingProfile(true); // ローディング開始
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
    try {
        const storage = getStorage();
        const storageRef = ref(storage, `artifacts/${appId}/users/${userId}/profileImages/profile.jpg`);

        await uploadBytes(storageRef, file);
<<<<<<< HEAD

        const imageUrl = await getDownloadURL(storageRef);

        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        await updateDoc(userProfileRef, {
            profileImageUrl: imageUrl
        });
=======
        const imageUrl = await getDownloadURL(storageRef);

        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        await updateDoc(userProfileRef, { profileImageUrl: imageUrl });
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
        
        if (handleProfileImageUpload && typeof handleProfileImageUpload === 'function') {
            const reader = new FileReader();
            reader.onloadend = () => {
<<<<<<< HEAD
                handleProfileImageUpload(reader.result);
=======
                handleProfileImageUpload(reader.result); // App.jsのstateを更新
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
            };
            reader.readAsDataURL(file);
        }

<<<<<<< HEAD
        setToast({
            message: 'プロフィール画像を更新しました。',
            type: 'success',
        });
=======
        setToast({ message: 'プロフィール画像を更新しました！', type: 'success' });
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421

    } catch (error) {
        console.error("Error uploading profile image:", error);
        setToast({
            message: `プロフィール画像の更新に失敗しました。\n詳細: ${error.message || error.toString()}`,
            type: 'error',
        });
    } finally {
<<<<<<< HEAD
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
=======
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

>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
    if (isAnonymousUser) {
      setModal({
        isOpen: true,
        title: '機能制限',
        message: 'プロフィールを保存するには、アカウント登録またはログインが必要です。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
<<<<<<< HEAD
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
=======
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
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
      setToast({
          message: `プロフィールの保存中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`,
          type: 'error',
      });
    } finally {
<<<<<<< HEAD
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
=======
      setModal(prev => ({ ...prev, isOpen: false }));
      setIsSavingProfile(false); // ローディング終了
      console.log("handleSaveProfile: 保存処理を終了しました。");
    }
  }, [tempUserName, userName, setUserName, setToast, db, appId, userId, isAnonymousUser, setModal]);


  return (
    <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center animate-slide-in-right">
      <h3 className="text-xl font-bold mb-4 text-blue-300">プロフィール</h3>
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421

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
<<<<<<< HEAD
          disabled={isAnonymousUser}
=======
          disabled={isAnonymousUser || isSavingProfile}
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
        />
        <button
          onClick={() => document.getElementById('profileImageUpload').click()}
          className={`px-5 py-2 rounded-full text-sm font-semibold shadow-md transition-all duration-300 transform hover:scale-105
<<<<<<< HEAD
            ${isAnonymousUser ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          disabled={isAnonymousUser}
=======
            ${isAnonymousUser || isSavingProfile ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          disabled={isAnonymousUser || isSavingProfile}
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
        >
          プロフィール画像を更新
        </button>
      </div>

      {/* ユーザー名 */}
<<<<<<< HEAD
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
=======
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
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
    </div>
  );
};

export default UserProfileSection;
