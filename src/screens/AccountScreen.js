import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, linkWithCredential, sendEmailVerification, signOut, updatePassword, signInAnonymously } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '../firebase/firebaseConfig';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
  setScreen
}) => {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isAccountLoading, setIsAccountLoading] = useState(true);
  const [isAnonymousUser, setIsAnonymousUser] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [userProfileImage, setUserProfileImage] = useState(profileImage);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [buildingName, setBuildingName] = useState('');


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
        setUserName(data.name || '');
        setUserEmail(auth.currentUser.email || data.email || '');
        setUserProfileImage(data.profileImageUrl || profileImage); 
        setPhoneNumber(data.phoneNumber || '');
        setZipCode(data.address?.zipCode || '');
        setPrefecture(data.address?.prefecture || '');
        setCity(data.address?.city || '');
        setStreetAddress(data.address?.streetAddress || '');
        setBuildingName(data.address?.buildingName || '');
      } else {
        await setDoc(userProfileRef, {
          name: '',
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
          createdAt: serverTimestamp()
        });
        setUserName('');
        setUserEmail(auth.currentUser.email || '');
        setUserProfileImage(profileImage);
        setPhoneNumber('');
        setZipCode('');
        setPrefecture('');
        setCity('');
        setStreetAddress('');
        setBuildingName('');
      }

      setIsEmailVerified(auth.currentUser.emailVerified);

    } catch (error) {
      console.error("Error fetching user profile:", error);
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'ユーザープロフィールの読み込み中にエラーが発生しました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsAccountLoading(false);
    }
  }, [db, userId, appId, setModal, auth, profileImage]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

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
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, `artifacts/${appId}/users/${userId}/profileImages/profile.jpg`);

        await uploadBytes(storageRef, file);

        const imageUrl = await getDownloadURL(storageRef);

        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        await updateDoc(userProfileRef, {
            profileImageUrl: imageUrl
        });

        setUserProfileImage(imageUrl);
        
        if (handleProfileImageUpload) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleProfileImageUpload(reader.result);
            };
            reader.readAsDataURL(file);
        }

        setModal({
            isOpen: true,
            title: '更新完了',
            message: 'プロフィール画像を更新しました。',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
        });

    } catch (error) {
        console.error("Error uploading profile image:", error);
        setModal({
            isOpen: true,
            title: 'エラー',
            message: `プロフィール画像の更新に失敗しました。\n詳細: ${error.message}`,
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
        });
    } finally {
        setIsAccountLoading(false);
    }
  };


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
        name: userName,
        profileImageUrl: userProfileImage,
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
      setModal({
        isOpen: true,
        title: '保存完了',
        message: 'プロフィール情報を保存しました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } catch (error) {
      console.error("Error saving user profile:", error);
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'プロフィールの保存中にエラーが発生しました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsAccountLoading(false);
    }
  };

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

    setIsAccountLoading(true);
    try {
      if (user.isAnonymous) {
        const credential = EmailAuthProvider.credential(userEmail, newPassword);
        await linkWithCredential(user, credential);

        setModal({
          isOpen: true,
          title: 'アカウント連携完了',
          message: 'メールアドレスとパスワードをアカウントに紐付けました。今後はこのメールアドレスでログインできます。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
        setIsEmailVerified(user.emailVerified);
        setIsAnonymousUser(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setIsEditing(false);
        setCurrentPassword('');

      } else {
        if (user.email === userEmail && !isLinkAccount) {
          setModal({
            isOpen: true,
            title: '情報',
            message: '現在登録されているメールアドレスと同じです。',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        await updateEmail(user, userEmail);

        setModal({
          isOpen: true,
          title: 'メールアドレス更新',
          message: 'メールアドレスを更新しました。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
        setIsEmailVerified(user.emailVerified);
        setCurrentPassword('');
      }

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
      setIsAccountLoading(false);
    }
  };

  // パスワード変更ハンドラ（ログイン済み正規ユーザー向け）
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

    setIsAccountLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      setModal({
        isOpen: true,
        title: 'パスワード変更完了',
        message: 'パスワードが正常に変更されました。',
        onConfirm: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          setIsPasswordChanging(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
        },
        showCancelButton: false,
      });
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
      setIsAccountLoading(false);
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

    setIsAccountLoading(true);
    try {
      await sendEmailVerification(user);
      setModal({
        isOpen: true,
        title: '認証メール再送信',
        message: '認証メールを再送信しました。ご確認ください。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      setModal({
        isOpen: true,
        title: 'エラー',
        message: '認証メールの送信中にエラーが発生しました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsAccountLoading(false);
    }
  };

  const handleLogout = async () => {
    setModal({
      isOpen: true,
      title: 'ログアウト確認',
      message: 'ログアウトしますか？\nゲストユーザーとして続行する場合は、残高やポイントは保存されません。',
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        setIsAccountLoading(true);
        try {
          await signOut(auth);
          await signInAnonymously(auth);
          setScreen('guest_intro');
        } catch (error) {
          console.error("Logout failed:", error);
          setModal({
            isOpen: true,
            title: 'ログアウト失敗',
            message: 'ログアウト中にエラーが発生しました。',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
        } finally {
          setIsAccountLoading(false);
        }
      },
      onCancel: () => setModal(prev => ({ ...prev, isOpen: false })),
      showCancelButton: true,
    });
  };

  return (
    <div className="p-4 text-white animate-fade-in font-inter"> {/* font-inter を追加 */}
      <h2 className="text-3xl font-bold mb-6 text-center">アカウント設定</h2>

      {isAccountLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* 匿名ユーザーの場合のメッセージ */}
          {isAnonymousUser && (
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

          {/* Profile Image Section */}
          <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center animate-slide-in-right">
            <h3 className="text-xl font-bold mb-4 text-blue-300">プロフィール</h3>
            <div className="w-28 h-28 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden mb-4 border-4 border-blue-400 shadow-inner">
              {userProfileImage ? (
                <img src={userProfileImage} alt="プロフィール" className="w-full h-full object-cover" />
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

          {/* User Info Section / Account Link Section / Password Change Section */}
          <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-left">
            <h3 className="text-xl font-bold mb-4 text-blue-300">
              {isAnonymousUser ? 'アカウント連携' : '基本情報'}
            </h3>
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
                {/* 既存のUser Info Fields */}
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="userName">
                    名前
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
                      placeholder="名前を入力してください"
                    />
                  ) : (
                    <p className="text-white text-lg">{userName || '未設定'}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="userEmail">
                    メールアドレス
                  </label>
                  {isEditing ? (
                    <>
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
                    </>
                  ) : (
                    <p className="text-white text-lg">{userEmail || '未設定'}</p>
                  )}
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
                          fetchUserProfile(); // キャンセル時にデータを再フェッチして元の値に戻す
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
              </>
            )}
          </div>

          {/* Password Change Section (匿名ユーザーの場合は非表示) */}
          {!isAnonymousUser && (
            <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-right">
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
                        placeholder="新しいパスワード (8文字以上)"
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
                        placeholder="新しいパスワードをもう一度入力"
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
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setIsPasswordChanging(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                        setPasswordError('');
                      }}
                      className="bg-gray-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
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
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
                >
                  パスワードを変更する
                </button>
              )}
            </div>
          )}

          {/* Store Mode Section */}
          <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-right">
            <h3 className="text-xl font-bold mb-4 text-blue-300">店舗モード設定</h3>
            <div className="flex items-center justify-between mb-4">
              <span>店舗モードを有効にする</span>
              <label className="switch relative inline-block w-12 h-7">
                <input
                  type="checkbox"
                  checked={isStoreMode}
                  onChange={(e) => setIsStoreMode(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                  disabled={isAnonymousUser}
                />
                <span className={`slider absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-300 peer-checked:bg-green-500 ${isAnonymousUser ? 'bg-gray-500 cursor-not-allowed' : 'bg-gray-600'}`}></span>
                <span className={`dot absolute content-[''] h-5 w-5 left-1 bottom-1 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-5 ${isAnonymousUser ? 'bg-gray-300' : 'bg-white'}`}></span>
              </label>
            </div>
            {isStoreMode && (
              <div className="flex flex-col items-center mt-4 border-t border-gray-700 pt-4">
                <h3 className="text-xl font-bold mb-2 text-blue-300">店舗ロゴ</h3>
                <div className="w-28 h-28 bg-gray-600 flex items-center justify-center overflow-hidden mb-4 rounded-full border-4 border-blue-400 shadow-inner">
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
                  disabled={isAnonymousUser}
                />
                <button
                  onClick={() => document.getElementById('storeLogoUpload').click()}
                  className={`px-5 py-2 rounded-full text-sm font-semibold shadow-md hover:scale-105 transition-all duration-300 transform
                    ${isAnonymousUser ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  disabled={isAnonymousUser}
                >
                  店舗ロゴを更新
                </button>
              </div>
            )}
          </div>

          {/* Important Information Section */}
          <div className="mb-6 bg-gray-800 p-6 rounded-xl shadow-lg animate-slide-in-right">
            <h3 className="text-xl font-bold mb-4 text-blue-300">重要情報</h3>
            <button
              onClick={() => window.open('https://example.com/terms-of-service', '_blank')}
              className="w-full text-left p-3 rounded-md hover:bg-gray-700 transition-colors flex justify-between items-center"
            >
              <span className="text-lg">利用規約</span>
              <span className="text-gray-400">&gt;</span>
            </button>
            <hr className="border-gray-700 my-3" />
            <button
              onClick={() => window.open('https://example.com/privacy-policy', '_blank')}
              className="w-full text-left p-3 rounded-md hover:bg-gray-700 transition-colors flex justify-between items-center"
            >
              <span className="text-lg">プライバシーポリシー</span>
              <span className="text-gray-400">&gt;</span>
            </button>
          </div>

          {/* ログアウトボタン (匿名ユーザーの場合は非表示) */}
          {!isAnonymousUser && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                ログアウト
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccountScreen;
