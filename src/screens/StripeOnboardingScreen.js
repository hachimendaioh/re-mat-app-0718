// src/screens/StripeOnboardingScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import LoadingSpinner from '../components/common/LoadingSpinner';

const StripeOnboardingScreen = ({ userId, setScreen, setModal, setToast, db, appId, firebaseApp, isStoreMode }) => {
  const [profileData, setProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null); // 'not_created', 'pending', 'active'
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // ユーザープロフィールとStripeステータスを読み込む
  useEffect(() => {
    const fetchProfile = async () => {
      if (!db || !appId || !userId) {
        setIsLoadingProfile(false);
        return;
      }
      try {
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData(data);
          // Stripeステータスを確認
          if (data.stripeConnectAccountId) {
            setStripeStatus(data.stripeConnectStatus || 'pending');
          } else {
            setStripeStatus('not_created');
          }
        }
      } catch (error) {
        console.error("StripeOnboardingScreen: Error fetching profile:", error);
        setToast({ message: `プロフィール情報の取得に失敗しました: ${error.message}`, type: 'error' });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [db, appId, userId, setToast]);

  // Stripe Connectステータスを再確認
  const handleCheckStatus = useCallback(async () => {
    if (!firebaseApp) return;
    setIsCheckingStatus(true);
    try {
      const functionsInstance = getFunctions(firebaseApp);
      const checkStatus = httpsCallable(functionsInstance, 'checkStripeConnectStatus');
      const result = await checkStatus({});
      setStripeStatus(result.data.status);

      if (result.data.status === 'active') {
        setToast({ message: 'Stripe Connectのオンボーディングが完了しています！', type: 'success' });
      } else {
        setToast({ message: 'オンボーディングはまだ完了していません。続行してください。', type: 'info' });
      }
    } catch (error) {
      console.error("StripeOnboardingScreen: Error checking status:", error);
      setToast({ message: `ステータス確認に失敗しました: ${error.message}`, type: 'error' });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [firebaseApp, setToast]);

  // Stripe Connect アカウントを作成してオンボーディングURLを開く
  const handleStartOnboarding = useCallback(async () => {
    if (!firebaseApp) {
      setToast({ message: 'Firebaseが初期化されていません。', type: 'error' });
      return;
    }

    setIsCreatingAccount(true);
    setModal({
      isOpen: true,
      title: 'Stripe登録を準備中',
      message: 'ユーザー情報を基にStripeアカウントを作成しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

    try {
      const functionsInstance = getFunctions(firebaseApp);
      const createAccount = httpsCallable(functionsInstance, 'createStripeConnectAccount');

      // 現在のページURLをベースにreturnUrlとrefreshUrlを設定
      const baseUrl = window.location.origin + window.location.pathname;
      const result = await createAccount({
        returnUrl: baseUrl + '?stripe_onboarding=complete',
        refreshUrl: baseUrl + '?stripe_onboarding=refresh',
      });

      setModal(prev => ({ ...prev, isOpen: false }));

      if (result.data.success && result.data.url) {
        setStripeStatus('pending');
        // Stripeオンボーディングページを新しいタブで開く
        window.open(result.data.url, '_blank');
        setToast({ message: 'Stripeの登録ページが新しいタブで開きました。', type: 'success' });
      }
    } catch (error) {
      console.error("StripeOnboardingScreen: Error creating account:", error);
      setModal({
        isOpen: true,
        title: 'Stripe登録エラー',
        message: `Stripeアカウントの作成に失敗しました。\n${error.message || '不明なエラー'}`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } finally {
      setIsCreatingAccount(false);
    }
  }, [firebaseApp, setModal, setToast]);

  // プリフィルされる情報を表示用にまとめる
  const getPrefilledInfo = () => {
    if (!profileData) return [];

    const info = [];
    if (profileData.name) info.push({ label: '名前', value: profileData.name });
    if (profileData.email) info.push({ label: 'メールアドレス', value: profileData.email });
    if (profileData.phoneNumber) info.push({ label: '電話番号', value: profileData.phoneNumber });

    const addr = profileData.address;
    if (addr) {
      const addressStr = [addr.zipCode, addr.prefecture, addr.city, addr.streetAddress, addr.buildingName]
        .filter(Boolean).join(' ');
      if (addressStr) info.push({ label: '住所', value: addressStr });
    }

    if (isStoreMode || profileData.isStore) {
      if (profileData.storeName) info.push({ label: '店舗名', value: profileData.storeName });
      if (profileData.storePhoneNumber) info.push({ label: '店舗電話番号', value: profileData.storePhoneNumber });
      const storeAddr = profileData.storeAddress;
      if (storeAddr) {
        const storeAddrStr = [storeAddr.zipCode, storeAddr.prefecture, storeAddr.city, storeAddr.streetAddress, storeAddr.buildingName]
          .filter(Boolean).join(' ');
        if (storeAddrStr) info.push({ label: '店舗住所', value: storeAddrStr });
      }
    }

    return info;
  };

  if (isLoadingProfile) {
    return (
      <div className="flex-grow p-4 flex items-center justify-center">
        <LoadingSpinner />
        <p className="text-white ml-2">プロフィール情報を読み込み中...</p>
      </div>
    );
  }

  const prefilledInfo = getPrefilledInfo();

  return (
    <div className="flex-grow p-4 text-white font-inter animate-fade-in overflow-y-auto pb-48">
      <h2 className="text-3xl font-bold mb-6 text-center">Stripe Connect 登録</h2>

      {/* ステータス表示 */}
      {stripeStatus === 'active' && (
        <div className="bg-green-700 rounded-xl p-4 mb-6 w-full max-w-md mx-auto text-center">
          <p className="text-lg font-bold">Stripe Connect 登録済み</p>
          <p className="text-sm mt-1">決済の受付と入金が有効になっています。</p>
        </div>
      )}
      {stripeStatus === 'pending' && (
        <div className="bg-yellow-700 rounded-xl p-4 mb-6 w-full max-w-md mx-auto text-center">
          <p className="text-lg font-bold">オンボーディング未完了</p>
          <p className="text-sm mt-1">Stripeの登録手続きを完了してください。</p>
        </div>
      )}

      {/* プリフィル情報の確認 */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6 w-full max-w-md mx-auto shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-blue-300">Stripeに自動入力される情報</h3>
        <p className="text-gray-400 text-sm mb-4">
          以下のユーザー登録情報がStripeの登録画面に自動で入力されます。
          変更が必要な場合は、先にプロフィール画面で更新してください。
        </p>

        {prefilledInfo.length > 0 ? (
          <div className="space-y-3">
            {prefilledInfo.map((item, index) => (
              <div key={index} className="flex justify-between items-start border-b border-gray-700 pb-2">
                <span className="text-gray-400 text-sm font-semibold min-w-[100px]">{item.label}</span>
                <span className="text-white text-sm text-right">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-yellow-300 text-sm">
            <p>プロフィール情報が登録されていません。</p>
            <p>先にプロフィール画面で基本情報を入力してください。</p>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="w-full max-w-md mx-auto flex flex-col space-y-4">
        {stripeStatus !== 'active' && (
          <button
            onClick={handleStartOnboarding}
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
            disabled={isCreatingAccount}
          >
            {isCreatingAccount ? <LoadingSpinner size="sm" /> : (
              stripeStatus === 'pending' ? 'Stripe登録を続ける' : 'Stripe Connect に登録する'
            )}
          </button>
        )}

        {stripeStatus === 'pending' && (
          <button
            onClick={handleCheckStatus}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? <LoadingSpinner size="sm" /> : 'ステータスを確認'}
          </button>
        )}

        <button
          onClick={() => setScreen('profile_details')}
          className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
        >
          プロフィールを編集
        </button>

        <button
          onClick={() => setScreen('home')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default StripeOnboardingScreen;
