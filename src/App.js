import React, { useState, useCallback, useEffect } from 'react';

// Firebase imports (firebaseConfig.jsからインポート)
import { doc, setDoc, updateDoc, collection, query, onSnapshot, addDoc, serverTimestamp, writeBatch, where, getDocs, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // Cloud Functions SDK をインポート
import { getAuth, signInAnonymously } from 'firebase/auth'; // Auth SDK をインポート (テスト用)

// 共通コンポーネントのインポート
import LoadingSpinner from './components/common/LoadingSpinner';
import CustomModal from './components/common/CustomModal';
import ToastNotification from './components/common/ToastNotification';

// 各画面コンポーネントのインポート
import SplashScreen from './screens/SplashScreen';
import GuestIntroScreen from './screens/GuestIntroScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import RegisterCompleteScreen from './screens/RegisterScreen';
import AccountBenefitsScreen from './screens/AccountBenefitsScreen';
import PaymentCompleteScreen from './screens/PaymentCompleteScreen';
import PayWithReMatScreen from './screens/PayWithReMatScreen';
import PointsScreen from './screens/PointsScreen';
import HistoryScreen from './screens/HistoryScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ChargeScreen from './screens/ChargeScreen';
import ScanScreen from './screens/ScanScreen';
import AccountScreen from './screens/AccountScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import PaymentConfirmationScreen from './screens/PaymentConfirmationScreen';
import ReceivePaymentScreen from './screens/ReceivePaymentScreen';
import WalletScreen from './screens/WalletScreen'; // WalletScreenをインポート

// サイドドロワーコンポーネントをインポート
import SideDrawer from './components/SideDrawer';

// 新しく作成したカスタムフックとコンポーネントをインポート
import { useAppInit } from './hooks/useAppInit';
import { useAppLogger } from './hooks/useAppLogger';
import DebugInfo from './components/layout/DebugInfo';
import NavigationBar from './components/layout/NavigationBar';
import HomeDashboard from './components/layout/HomeDashboard';


// --- Main App Component ---
export default function ReMatApp() {
  const [screen, setScreen] = useState('guest_intro');
  const [isStoreMode, setIsStoreMode] = useState(false);
  const [storeLogo, setStoreLogo] = useState(null);
  const [chargeAmount, setChargeAmount] = useState('');
  const [scannedAmount, setScannedAmount] = useState(null);
  const [scannedStoreId, setScannedStoreId] = useState(null);
  const [scanInputAmount, setScanInputAmount] = useState('');
  const [scanError, setScanError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [scanMode, setScanMode] = useState('initial');
  const [lastTransactionDetails, setLastTransactionDetails] = useState({ type: null, amount: 0 });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // useAppInitカスタムフックからFirebase関連の状態とインスタンスを取得
  const {
    userId,
    setUserId, // useAppInitからsetUserIdを受け取る
    isFirebaseReady,
    isInitialDataLoaded,
    splashScreenTimerCompleted,
    balance,
    points,
    userName,
    profileImage,
    history,
    notifications,
    auth,
    db,
    appId,
    firebaseApp, // useAppInit から firebaseApp インスタンスを取得
    setBalance,
    setPoints,
    setUserName,
    setProfileImage,
    setHistory,
    setNotifications
  } = useAppInit();

  // useAppLoggerカスタムフックから画面表示用ログを取得
  const onScreenLogs = useAppLogger(isFirebaseReady, appId, screen, auth, userId);


  const appLastUpdated = "2025年7月14日 15:00 JST"; 

  const initialModalState = {
    isOpen: false, title: '', message: '', onConfirm: () => {}, onCancel: () => {}, showCancelButton: false, customContent: null,
  };
  const [modal, setModal] = useState(initialModalState);
  const resetModal = () => setModal(initialModalState);

  const [toast, setToast] = useState(null);
  const hideToast = useCallback(() => { setToast(null); }, []);

  // 全体的なローディング完了を判断するuseEffect
  useEffect(() => {
    console.log(`Loading check: FirebaseReady=${isFirebaseReady}, DataLoaded=${isInitialDataLoaded}, SplashTimerDone=${splashScreenTimerCompleted}`);
    if (isFirebaseReady && isInitialDataLoaded && splashScreenTimerCompleted) {
      setIsLoading(false); // アプリ全体のローディングを終了
      console.log("Overall app loading complete.");

      // ログイン状態に応じて初期画面を設定
      if (auth && auth.currentUser) { // authインスタンスとcurrentUserが存在することを確認
        if (!auth.currentUser.isAnonymous) {
          setScreen('home'); // ログイン済みならhome
        } else {
          setScreen('guest_intro'); // 匿名ユーザーならguest_intro
        }
      } else {
        // auth.currentUser がまだ設定されていない場合（初期ロード時など）は、ゲスト画面へ
        setScreen('guest_intro');
      }
    }
  }, [isFirebaseReady, isInitialDataLoaded, splashScreenTimerCompleted, auth, setIsLoading, setScreen]);


  const handleProfileImageUpload = useCallback((base64Data) => {
    setProfileImage(base64Data); // setProfileImageはuseAppInitから提供される
    console.log("App.js: profileImage state updated with Base64 data.");
  }, [setProfileImage]);


  const handleStoreLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // handleCharge関数。確認モーダルを追加
  // selectedMethod 引数を追加
  const handleCharge = useCallback(async (amount, selectedMethod = 're_mat_balance') => {
    console.log(`App.js: handleCharge called. Amount: ${amount}, Method: ${selectedMethod}`);

    if (isNaN(amount) || amount <= 0) {
      setModal({
        isOpen: true,
        title: 'チャージエラー',
        message: '有効なチャージ金額を選択してください。（1円以上の数字）',
        onConfirm: () => resetModal(),
        showCancelButton: false,
      });
      return;
    }

    if (auth.currentUser?.isAnonymous) {
      setModal({
        isOpen: true,
        title: '機能制限',
        message: 'チャージ機能をご利用いただくには、アカウント登録またはログインが必要です。',
        onConfirm: () => {
          resetModal();
          setScreen('register');
        },
        showCancelButton: false,
      });
      return;
    }

    // Re-Mat残高チャージ以外はデモとして処理
    if (selectedMethod !== 're_mat_balance') {
      const methodNameMap = {
        'credit_card': 'クレジットカード',
        'bank_transfer': '銀行振込',
        'convenience_store': 'コンビニ決済',
      };
      setModal({
        isOpen: true,
        title: `${methodNameMap[selectedMethod]}チャージ (デモ)`,
        message: `¥${amount.toLocaleString()}を${methodNameMap[selectedMethod]}でチャージするデモが完了しました。\n\n実際の連携には、決済ゲートウェイとのセキュアなAPI統合が必要です。`,
        onConfirm: () => {
          resetModal();
          // デモなので、残高は実際に増えないが、完了画面に遷移
          setLastTransactionDetails({ type: 'charge', amount: amount });
          setScreen('支払い完了');
          setToast({ message: `¥${amount.toLocaleString()}をチャージしました！ (デモ)`, type: 'success' });
        },
        showCancelButton: false,
      });
      return; // デモ処理で終了
    }


    if (!db || !userId) {
      console.error("Firestore not initialized or user not authenticated.");
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'サービスが利用できません。時間をおいて再度お試しください。',
        onConfirm: () => resetModal(),
        showCancelButton: false,
      });
      return;
    }

    // チャージ確認モーダルを表示
    setModal({
      isOpen: true,
      title: 'チャージ確認',
      message: `¥${amount.toLocaleString()}をチャージしますか？`,
      showCancelButton: true,
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isOpen: false })); // 確認モーダルを閉じる

        // 実際のチャージ処理を開始
        setModal({
          isOpen: true,
          title: 'チャージ中',
          message: 'チャージ処理を実行しています...',
          customContent: <LoadingSpinner />,
          showCancelButton: false,
          onConfirm: () => {},
        });

        try {
          const profileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
          const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
          const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);

          // バッチ処理を開始
          const batch = writeBatch(db);

          // 1. プロフィールの残高とポイントを更新
          batch.update(profileDocRef, {
            balance: balance + amount,
            points: points + Math.floor(amount * 0.01) // 例: チャージで1%ポイント付与
          });
          console.log("Firestore Batch: Profile update added to batch.");

          // 2. 取引履歴を追加
          const newTransactionRef = doc(transactionsColRef); // 新しいドキュメント参照を作成
          batch.set(newTransactionRef, { // set を使用して新しいドキュメントを設定
            store: 'チャージ',
            amount: amount,
            date: serverTimestamp(),
            type: 'charge',
            notification_type: 'info',
            timestamp: serverTimestamp()
          });
          console.log("Firestore Batch: Transaction add added to batch.");

          // 3. 通知を追加
          const newNotificationRef = doc(notificationsColRef); // 新しいドキュメント参照を作成
          batch.set(newNotificationRef, { // set を使用して新しいドキュメントを設定
            text: `¥${amount.toLocaleString()}をチャージしました。現在の残高：¥${(balance + amount).toLocaleString()}`,
            read: false,
            type: 'info',
            timestamp: serverTimestamp()
          });
          console.log("Firestore Batch: Notification add added to batch.");

          // バッチをコミット
          await batch.commit();
          console.log("Firestore Batch: All operations committed successfully.");


          setChargeAmount('');
          setLastTransactionDetails({ type: 'charge', amount: amount }); // チャージのトランザクション詳細を記録
          setScreen('支払い完了');
          resetModal();
          setToast({ message: `¥${amount.toLocaleString()}をチャージしました！`, type: 'success' });
        } catch (error) {
          console.error("Error during charge (Batch failed):", error); // エラーログをバッチ失敗用に変更
          setModal({
            isOpen: true,
            title: 'チャージ失敗',
            message: `チャージ処理中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`, // エラー詳細を表示
            onConfirm: () => resetModal(),
            showCancelButton: false,
          });
          setToast({ message: `チャージ失敗: ${error.message || '不明なエラー'}`, type: 'error' });
        }
      },
      onCancel: () => {
        resetModal(); // キャンセルされた場合はモーダルを閉じる
        setToast({ message: 'チャージがキャンセルされました。', type: 'info' });
      }
    });
  }, [balance, userId, db, auth, appId, setModal, resetModal, setToast, setScreen, setChargeAmount, setBalance, setPoints, setLastTransactionDetails]);

  // confirmPayment 関数を Cloud Functions (processPayment) を呼び出すように修正
  const confirmPayment = useCallback(async (paymentAmount, storeNameForHistory = 'QR決済店舗') => {
    console.log("confirmPayment: 関数が呼び出されました。");
    console.log("confirmPayment: paymentAmount =", paymentAmount);
    console.log("confirmPayment: scannedStoreId =", scannedStoreId);

    // 支払い処理中のモーダルを表示
    setModal({
      isOpen: true,
      title: '支払い中',
      message: '支払い処理を実行しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

    if (!auth?.currentUser || !firebaseApp) { // firebaseApp の存在チェックを追加
      console.error("Firebase App not initialized or user not authenticated.");
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'サービスが利用できません。ログイン状態を確認してください。',
        onConfirm: () => resetModal(),
        showCancelButton: false,
      });
      return;
    }

    // scannedStoreIdがオブジェクトの場合、receiverIdとreceiverNameを抽出
    const receiverId = typeof scannedStoreId === 'object' && scannedStoreId?.id ? scannedStoreId.id : null;
    const receiverName = typeof scannedStoreId === 'object' && scannedStoreId?.name ? scannedStoreId.name : null;

    console.log("confirmPayment: receiverId =", receiverId);
    console.log("confirmPayment: receiverName =", receiverName);

    try {
      // Functions インスタンスを取得
      const functionsInstance = getFunctions(firebaseApp);
      console.log("confirmPayment: Functions Instance:", functionsInstance); // 追加ログ

      // processPayment Callable Function の参照を作成
      // 関数名 ('processPayment') とリージョン ('us-central1') は、
      // デプロイした Cloud Function と正確に一致している必要があります。
      const callProcessPayment = httpsCallable(functionsInstance, 'processPayment');
      console.log("confirmPayment: callProcessPayment Callable:", callProcessPayment); // 追加ログ

      console.log("Cloud Function 'processPayment' を呼び出し中...");

      // Cloud Function を呼び出すためのペイロード
      const callData = {
        receiverId: receiverId,
        amount: paymentAmount,
        senderName: userName, // 現在のユーザー名（通知用）
        receiverName: receiverName // 受取人の名前（通知用）
      };
      console.log("confirmPayment: Calling Cloud Function with data:", callData); // 追加ログ

      const result = await callProcessPayment(callData);

      console.log('Cloud Function 呼び出し成功:', result.data);

      // Functionsからの結果に基づいてUIを更新
      // Cloud Function 側で残高やポイントが更新されるため、ここではstateを直接更新しない
      // 必要であれば、Functions からの最新残高やポイントを受け取ってstateを更新するロジックを追加
      // 例: setBalance(result.data.newSenderBalance); setPoints(result.data.newSenderPoints);

      setScannedAmount(null);
      setScannedStoreId(null);
      setScanInputAmount('');
      setLastTransactionDetails({ type: 'payment', amount: paymentAmount });
      setScanMode('initial');
      setScreen('支払い完了');
      resetModal();
      setToast({ message: `¥${paymentAmount.toLocaleString()}の支払いが完了しました！`, type: 'success' });

    } catch (error) {
      console.error("Error calling Cloud Function 'processPayment':", error);

      let errorMessage = '支払い処理中にエラーが発生しました。';
      if (error.code) {
        // Callable Function からの HttpsError
        errorMessage = `支払い失敗: ${error.message || '不明なエラー'}`;
        if (error.details) {
          // Functions 側でエラー詳細が提供されている場合
          console.error("Functions Error Details:", error.details);
          // errorMessage += `\n詳細: ${JSON.stringify(error.details)}`; // 必要であれば詳細も表示
        }
      } else {
        // その他のネットワークエラーなど
        errorMessage += `\n詳細: ${error.message || error.toString()}`;
      }

      setModal({
        isOpen: true,
        title: '支払い失敗',
        message: errorMessage,
        onConfirm: () => resetModal(),
        showCancelButton: false,
      });
      setToast({ message: `支払い失敗: ${error.message || '不明なエラー'}`, type: 'error' });
    }
  }, [balance, userId, db, appId, setModal, resetModal, setToast, setScreen, setScannedAmount, setScannedStoreId, setScanInputAmount, setLastTransactionDetails, setScanMode, userName, setBalance, setPoints, auth, firebaseApp]);

  // handleNotificationRead と handleMarkAllNotificationsRead は変更なし
  const handleNotificationRead = useCallback(async (id) => {
    if (!db || !userId) {
      console.error("Firestore not initialized or user not authenticated.");
      return;
    }
    try {
      const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
      const notificationDocRef = doc(notificationsColRef, id);
      await updateDoc(notificationDocRef, {
        read: true
      });
      // onSnapshotがnotificationsステートを更新するため、ここでは直接setNotificationsは不要
    } catch (error) {
      console.error("Error marking notification as read:", error);
      setToast({ message: `通知既読処理失敗: ${error.message || '不明なエラー'}`, type: 'error' });
    }
  }, [db, userId, appId, setToast]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    if (!db || !userId) {
      console.error("Firestore not initialized or user not authenticated.");
      return;
    }
    setModal({
      isOpen: true,
      title: '処理中',
      message: '通知を既読にしています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

    try {
      const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
      const unreadNotificationsQuery = query(notificationsColRef, where('read', '==', false));
      const snapshot = await getDocs(unreadNotificationsQuery);

      if (snapshot.empty) {
        console.log("No unread notifications to mark as read.");
        resetModal();
        setToast({ message: '既読にする通知はありません。', type: 'info' });
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnapshot => {
        batch.update(doc(notificationsColRef, docSnapshot.id), { read: true });
      });
      await batch.commit();

      setModal({
        isOpen: true,
        title: '通知',
        message: 'すべての通知を既読にしました。',
        onConfirm: () => resetModal(),
        showCancelButton: false,
      });
      setToast({ message: 'すべての通知を既読にしました！', type: 'success' });
      // onSnapshotがnotificationsステートを更新するため、ここでは直接setNotificationsは不要

    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'すべての通知を既読にする際にエラーが発生しました。',
        onConfirm: () => resetModal(),
        showCancelButton: false,
      });
      setToast({ message: `一括既読失敗: ${error.message || '不明なエラー'}`, type: 'error' });
    }
  }, [db, userId, appId, setModal, resetModal, setToast]);


  const handleScanStart = useCallback(() => { // useCallback でラップして安定性を確保
    setScanMode('scanning');
    setScanError('');
  }, [setScanMode, setScanError]);


  // PaymentConfirmationScreen からキャンセルされた場合
  const handlePaymentCancel = useCallback(() => {
    setScannedAmount(null);
    setScannedStoreId(null);
    setScanInputAmount('');
    setScreen('スキャン');
    resetModal();
    setToast({ message: '支払いをキャンセルしました。', type: 'info' });
  }, [setScannedAmount, setScannedStoreId, setScanInputAmount, setScreen, resetModal, setToast]);


  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // --- Main Rendering Part ---
  return (
    <div className="min-h-screen bg-gray-900 font-sans font-inter flex flex-col">
      {/* Tailwind CSS Keyframe Animations Definition (これは常に必要なので外に出す) */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-right {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-left {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); }
        }
        /* 新しいアニメーション定義 */
        @keyframes pop-success {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          40% { transform: scale(1.3) rotate(10deg); opacity: 1; }
          70% { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        /* トースト通知用アニメーション */
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-up-out {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }


        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        .animate-fade-in-up.delay-100 { animation-delay: 0.1s; }
        .animate-slide-in-right { animation: slide-in-right 0.6s ease-out forwards; }
        .animate-slide-in-left { animation: slide-in-left 0.6s ease-out forwards; }
        .animate-bounce-in { animation: bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards; }
        .animate-pop-success { animation: pop-success 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; } /* 新しいアニメーションクラス */
        .animate-slide-down { animation: slide-down 0.3s ease-out forwards; }
        .animate-slide-up-out { animation: slide-up-out 0.3s ease-in forwards; }


        /* Custom Toggle Switch Style */
        .switch {
          position: relative;
          display: inline-block;
          width: 48px; /* 12 * 4px */
          height: 28px; /* 7 * 4px */
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .switch .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #4B5563; /* gray-600 */
          transition: .4s;
          border-radius: 28px; /* half of height */
        }
        .switch .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        .switch input:checked + .slider {
          background-color: #22C55E; /* green-500 */
        }
        .switch input:checked + .slider:before {
          transform: translateX(20px); /* 48px - 28px = 20px */
        }
      `}</style>

      {/* モーダルはローディング中でも表示されるように維持 */}
      {modal.isOpen && (
        <CustomModal
          title={modal.title}
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
          showCancelButton={modal.showCancelButton}
          customContent={modal.customContent}
          resetModal={resetModal}
        />
      )}

      {/* トースト通知 */}
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {isLoading ? ( // isLoadingがtrueの間はスプラッシュスクリーンを表示
        <SplashScreen lastUpdated={appLastUpdated} />
      ) : (
        // isLoadingがfalseになったらメインコンテンツとナビゲーションバー、または認証フロー画面を表示
        <>
          {/* 認証フロー画面 */}
          {screen === 'guest_intro' && <GuestIntroScreen setScreen={setScreen} setModal={setModal} auth={auth} />}
          {screen === 'login' && <LoginScreen setScreen={setScreen} setModal={setModal} auth={auth} setIsLoading={setIsLoading} setUserId={setUserId} />}
          {screen === 'register' && <RegisterScreen setScreen={setScreen} setModal={setModal} auth={auth} setIsLoading={setIsLoading} setUserId={setUserId} db={db} appId={appId} />}
          {screen === 'register_complete' && <RegisterCompleteScreen setScreen={setScreen} userEmail={auth?.currentUser?.email || ''} />}
          {screen === 'account_benefits' && <AccountBenefitsScreen setScreen={setScreen} />}
          {screen === 'forgot_password' && <ForgotPasswordScreen setScreen={setScreen} setModal={setModal} auth={auth} setIsLoading={setIsLoading} />}
          {screen === 'payment_confirmation' && (
            <PaymentConfirmationScreen
              amount={scannedAmount}
              balance={balance}
              storeId={scannedStoreId}
              onConfirmPayment={(storeNameFromConfirmation) => confirmPayment(scannedAmount, storeNameFromConfirmation)}
              onCancelPayment={handlePaymentCancel}
              isLoading={modal.isOpen && modal.title === '支払い中'}
            />
          )}

          {/* メインアプリケーションのコンテンツ (各画面コンポーネントを条件付きでレンダリング) */}
          {console.log(`App.js: Current screen is '${screen}'`)}

          {screen === 'home' && (
            <div className="flex-grow p-4 overflow-y-auto pb-48 bg-gray-900">

              {/* Top Header for Home Screen */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-b-xl shadow-lg mb-6">
                {/* Hamburger Icon */}
                <button
                  onClick={() => {
                    console.log("Hamburger icon clicked!");
                    setIsDrawerOpen(true);
                  }}
                  className="text-white focus:outline-none p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </button>
                {/* App Name / Logo */}
                <h1 className="text-3xl font-extrabold text-white tracking-wider">RE-Mat</h1>
                {/* Placeholder for future right-aligned icon if needed */}
                <div className="w-8 h-8"></div>
              </div>

              {/* デバッグ情報コンポーネントをレンダリング */}
              <DebugInfo
                screen={screen}
                userId={userId}
                auth={auth}
                isFirebaseReady={isFirebaseReady}
                isInitialDataLoaded={isInitialDataLoaded}
                splashScreenTimerCompleted={splashScreenTimerCompleted}
                scanMode={scanMode}
              />

              {/* ホームダッシュボードコンポーネントをレンダリング */}
              <HomeDashboard
                auth={auth}
                isStoreMode={isStoreMode}
                userId={userId}
                userName={userName}
                balance={balance}
                points={points}
                setScreen={setScreen}
                isLoading={isLoading}
              />
            </div>
          )}

          {screen === 'スキャン' && (
            <ScanScreen
              scannedAmount={scannedAmount}
              setScannedAmount={setScannedAmount}
              scanInputAmount={scanInputAmount}
              setScanInputAmount={setScanInputAmount}
              balance={balance} // balanceもScanScreenに渡す
              scanError={scanError}
              setScanError={setScanError}
              handleScanStart={handleScanStart} // App.jsのhandleScanStartを渡す
              scanMode={scanMode} // App.jsのscanModeを渡す
              setScanMode={setScanMode} // App.jsのsetScanModeを渡す
              setModal={setModal}
              setScreen={setScreen}
              setScannedStoreId={setScannedStoreId}
              userId={userId}
              db={db}
              appId={appId}
            />
          )}
          {screen === 'チャージ' && (
            <ChargeScreen
              balance={balance}
              setBalance={setBalance} // setBalanceを渡す
              chargeAmount={chargeAmount}
              setChargeAmount={setChargeAmount}
              handleCharge={handleCharge}
              setScreen={setScreen}
              setModal={setModal}
              setToast={setToast}
            />
          )}
          {screen === 'ポイント' && (
            <PointsScreen
              points={points}
              setScreen={setScreen}
              setModal={setModal}
              setToast={setToast}
              userId={userId}
              db={db}
              appId={appId}
            />
          )}
          {screen === '取引履歴' && (
            <HistoryScreen
              history={history}
              setScreen={setScreen}
              setModal={setModal}
            />
          )}
          {screen === 'notifications' && (
            <NotificationsScreen
              notifications={notifications}
              handleNotificationRead={handleNotificationRead}
              handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              setScreen={setScreen}
              setModal={setModal}
            />
          )}
          {screen === 'account' && (
            <AccountScreen
              auth={auth}
              userId={userId}
              userName={userName}
              setUserName={setUserName} // setUserNameを渡す
              profileImage={profileImage}
              handleProfileImageUpload={handleProfileImageUpload}
              setScreen={setScreen}
              setModal={setModal}
              setToast={setToast}
              db={db}
              appId={appId}
            />
          )}
          {screen === '支払い' && (
            <PayWithReMatScreen
              balance={balance}
              points={points}
              setScreen={setScreen}
              setModal={setModal}
              setToast={setToast}
              auth={auth}
            />
          )}
          {screen === '支払い完了' && ( // PaymentCompleteScreenを条件付きレンダリングに追加
            // PaymentCompleteScreenに背景色を追加して、真っ暗にならないようにする
            <div className="flex-grow p-4 bg-gray-900"> {/* このdivを追加 */}
              <PaymentCompleteScreen
                setScreen={setScreen}
                setModal={setModal}
                setToast={setToast}
                lastTransactionDetails={lastTransactionDetails}
                currentBalance={balance}
              />
            </div>
          )}
          {screen === '受け取る' && ( // ReceivePaymentScreenをレンダリング
            <ReceivePaymentScreen
              userId={userId}
              userName={userName}
              setScreen={setScreen}
              setModal={setModal}
              notifications={notifications}
              handleNotificationRead={handleNotificationRead}
            />
          )}
          {screen === 'wallet' && ( // WalletScreenのレンダリング
            <WalletScreen
              balance={balance}
              points={points}
              setScreen={setScreen}
              setModal={setModal} 
            />
          )}

          {/* 画面内コンソールログ表示エリア */}
          <div className="mx-4 mb-4 p-3 bg-gray-800 rounded-lg text-white text-xs overflow-auto max-h-48 font-mono">
            <h4 className="text-sm font-bold mb-2 border-b border-gray-700 pb-1">画面内ログ (エラーのみ表示)</h4>
            <pre className="whitespace-pre-wrap">
              {onScreenLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </pre>
          </div>

          {/* ナビゲーションバーコンポーネントをレンダリング */}
          {(screen === 'home' || screen === 'スキャン' || screen === 'チャージ' || screen === 'ポイント' || screen === '取引履歴' || screen === 'notifications' || screen === 'account' || screen === '支払い' || screen === '支払い完了' || screen === '受け取る' || screen === 'wallet') && (
            <NavigationBar
              setScreen={setScreen}
              auth={auth}
              unreadNotificationsCount={notifications.filter(n => !n.read).length}
            />
          )}

          {/* ゲストユーザーの場合、アカウント画面でログアウトボタンを「アカウント登録/ログイン」ボタンに置き換える */}
          {screen === 'account' && auth?.currentUser?.isAnonymous && (
            <div className="fixed bottom-0 left-0 w-full p-4 bg-gray-800 text-center shadow-lg z-10">
              <button
                onClick={() => setScreen('guest_intro')}
                className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95"
              >
                アカウント登録 / ログイン
              </button>
            </div>
          )}
          {/* 通常ユーザーの場合、アカウント画面でログアウトボタンを表示（AccountScreen内で管理） */}
          {screen === 'account' && !auth?.currentUser?.isAnonymous && (
            null
          )}
        </>
      )}
      {/* サイドドロワーをレンダリング (isOpen が true の場合のみ) */}
      {isDrawerOpen && (
        <SideDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          setScreen={setScreen}
          auth={auth}
          userId={userId}
          userName={userName}
          setModal={setModal}
        />
      )}
    </div>
  );
}
