import React, { useState, useCallback, useEffect } from 'react';

// Firebase imports (firebaseConfig.jsからインポート)
// useAppInitフック内でFirebaseインスタンスを取得するため、ここでは直接インポートしない
import { doc, setDoc, updateDoc, collection, query, onSnapshot, addDoc, serverTimestamp, writeBatch, where, getDocs, getDoc } from 'firebase/firestore';

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
  const [screen, setScreen] = useState('guest_intro'); // 初期画面を'guest_intro'に変更
  const [isStoreMode, setIsStoreMode] = useState(false); // この状態はApp.jsに残す
  const [storeLogo, setStoreLogo] = useState(null); // この状態はApp.jsに残す
  const [chargeAmount, setChargeAmount] = useState(''); // ChargeScreenに渡すためApp.jsに残す
  const [scannedAmount, setScannedAmount] = useState(null); // ScanScreenに渡すためApp.jsに残す
  const [scannedStoreId, setScannedStoreId] = useState(null); // ScanScreenに渡すためApp.jsに残す
  const [scanInputAmount, setScanInputAmount] = useState(''); // ScanScreenに渡すためApp.jsに残す
  const [scanError, setScanError] = useState(''); // ScanScreenに渡すためApp.jsに残す
  const [isLoading, setIsLoading] = useState(true); // 全体ローディング状態
  const [scanMode, setScanMode] = useState('initial'); // ScanScreenに渡すためApp.jsに残す
  const [lastTransactionDetails, setLastTransactionDetails] = useState({ type: null, amount: 0 }); // PaymentCompleteScreenに渡すためApp.jsに残す
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // サイドドロワーの開閉状態

  // useAppInitカスタムフックからFirebase関連の状態とインスタンスを取得
  const { 
    userId, 
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
    setBalance, // ★追加
    setPoints,   // ★追加
    setUserName, // ★追加
    setProfileImage, // ★追加
    setHistory, // ★追加
    setNotifications, // ★追加
    setUserId // ★この行が重要！useAppInitからsetUserIdを正しく受け取ります
  } = useAppInit();

  // useAppLoggerカスタムフックから画面表示用ログを取得
  const onScreenLogs = useAppLogger(isFirebaseReady, appId, screen, auth, userId);


  const appLastUpdated = "2024年6月26日 18:40 JST";

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
      setIsLoading(false);
      console.log("Overall app loading complete.");
      
      // ログイン状態に応じて初期画面を設定
      if (auth && auth.currentUser && !auth.currentUser.isAnonymous) {
        setScreen('home'); // ログイン済みならhome
      } else {
        setScreen('guest_intro'); // 匿名ユーザーならguest_intro
      }
    }
  }, [isFirebaseReady, isInitialDataLoaded, splashScreenTimerCompleted, auth]); // splashScreenTimerCompletedを依存配列に含める

  const handleProfileImageUpload = useCallback((base64Data) => {
    setProfileImage(base64Data); // setProfileImageはuseAppInitから提供される
    console.log("App.js: profileImage state updated with Base64 data.");
  }, [setProfileImage]); // setProfileImageを依存配列に追加


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
  const handleCharge = useCallback(async (amount) => { // amount を引数として受け取るように修正
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

          // 1. プロファイルの残高とポイントを更新
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
  }, [balance, userId, db, auth, appId, setModal, resetModal, setToast, setScreen, setChargeAmount, setBalance, setPoints]); // setBalance, setPointsを依存配列に追加

  // handlePayment関数はPaymentConfirmationScreenから呼ばれるように変更
  const confirmPayment = useCallback(async (paymentAmount, storeNameForHistory = 'QR決済店舗') => { // 金額と店舗名を引数として受け取る
    console.log("confirmPayment: 関数が呼び出されました。"); // デバッグログ
    console.log("confirmPayment: paymentAmount =", paymentAmount); // デバッグログ
    console.log("confirmPayment: scannedStoreId =", scannedStoreId); // デバッグログ

    setModal({
      isOpen: true,
      title: '支払い中',
      message: '支払い処理を実行しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {},
    });

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

    // scannedStoreIdがオブジェクトの場合、receiverIdとreceiverNameを抽出
    const receiverId = typeof scannedStoreId === 'object' && scannedStoreId?.id ? scannedStoreId.id : null;
    const receiverName = typeof scannedStoreId === 'object' && scannedStoreId?.name ? scannedStoreId.name : null; // receiverNameを取得
    const isReceiverPayment = !!receiverId; // receiverIdがあれば受取人支払い

    console.log("confirmPayment: isReceiverPayment =", isReceiverPayment); // デバッグログ
    console.log("confirmPayment: receiverId =", receiverId); // デバッグログ
    console.log("confirmPayment: receiverName =", receiverName); // デバッグログ


    // 送金先ユーザーのプロフィール参照
    let receiverProfileDocRef = null;
    if (isReceiverPayment) {
      receiverProfileDocRef = doc(db, `artifacts/${appId}/users/${receiverId}/profile`, 'userProfile');
      console.log("confirmPayment: receiverProfileDocRef created for:", receiverId); // デバッグログ
    }

    try {
      const profileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
      const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);

      const newBalance = balance - paymentAmount;
      const newPoints = points + Math.floor(paymentAmount * 0.03);

      // バッチ処理を開始
      const batch = writeBatch(db);
      console.log("confirmPayment: Firestore batch initialized."); // デバッグログ

      // 1. 送金元（現在のユーザー）の残高とポイントを更新
      batch.update(profileDocRef, {
        balance: newBalance,
        points: newPoints
      });
      console.log("Firestore Batch: Sender profile update added to batch.");

      // 2. 送金元（現在のユーザー）の取引履歴を追加
      const senderTransactionRef = doc(transactionsColRef);
      batch.set(senderTransactionRef, {
        store: isReceiverPayment ? receiverName || `ユーザーID: ${receiverId}` : storeNameForHistory, // 受取人名または従来の店舗名
        amount: -paymentAmount, // 支払いなのでマイナス
        date: serverTimestamp(),
        type: 'payment',
        notification_type: 'info',
        timestamp: serverTimestamp(),
        // 受取人支払いの場合は、受取人IDも記録
        ...(isReceiverPayment && { receiverId: receiverId })
      });
      console.log("Firestore Batch: Sender transaction add added to batch.");

      // 3. 送金元（現在のユーザー）への通知を追加
      const senderNotificationRef = doc(notificationsColRef);
      batch.set(senderNotificationRef, {
        text: `¥${paymentAmount.toLocaleString()}を${isReceiverPayment ? receiverName || '不明なユーザー' : storeNameForHistory}に支払いました。現在の残高：¥${newBalance.toLocaleString()}`,
        read: false,
        type: 'info',
        timestamp: serverTimestamp()
      });
      console.log("Firestore Batch: Sender notification add added to batch.");

      // 受取人（receiverIdが存在する場合）の残高とポイントを更新
      if (isReceiverPayment && receiverProfileDocRef) {
        console.log("confirmPayment: isReceiverPayment is true. Attempting to get receiver profile."); // デバッグログ
        // 受取人の現在の残高とポイントを取得（トランザクション内で安全に行う）
        const receiverDocSnap = await getDoc(receiverProfileDocRef); // ここでgetDocを使用
        console.log("confirmPayment: receiverDocSnap obtained. exists:", receiverDocSnap.exists()); // デバッグログ

        if (receiverDocSnap.exists()) {
          const receiverData = receiverDocSnap.data();
          const newReceiverBalance = (receiverData.balance || 0) + paymentAmount;
          const newReceiverPoints = (receiverData.points || 0) + Math.floor(paymentAmount * 0.005); // 受取人には少し少ないポイント付与

          batch.update(receiverProfileDocRef, {
            balance: newReceiverBalance,
            points: newReceiverPoints
          });
          console.log("Firestore Batch: Receiver profile update added to batch.");

          // 受取人の取引履歴を追加
          const receiverTransactionsColRef = collection(db, `artifacts/${appId}/users/${receiverId}/transactions`);
          const receiverTransactionRef = doc(receiverTransactionsColRef);
          batch.set(receiverTransactionRef, {
            store: userName || `ユーザーID: ${userId}`, // 送金元ユーザーの名前
            amount: paymentAmount, // 受取なのでプラス
            date: serverTimestamp(),
            type: 'receive',
            notification_type: 'info',
            timestamp: serverTimestamp(),
            senderId: userId // 送金元IDも記録
          });
          console.log("Firestore Batch: Receiver transaction add added to batch.");

          // 受取人への通知を追加
          const receiverNotificationsColRef = collection(db, `artifacts/${appId}/users/${receiverId}/notifications`);
          const receiverNotificationRef = doc(receiverNotificationsColRef);
          batch.set(receiverNotificationRef, {
            text: `¥${paymentAmount.toLocaleString()}を${userName || '不明なユーザー'}から受け取りました。現在の残高：¥${newReceiverBalance.toLocaleString()}`,
            read: false,
            type: 'info',
            timestamp: serverTimestamp()
          });
          console.log("Firestore Batch: Receiver notification add added to batch.");

        } else {
          console.warn(`confirmPayment: Receiver profile for ID ${receiverId} not found.`); // デバッグログ
          setModal({
            isOpen: true,
            title: '受取人エラー',
            message: '受取人のアカウントが見つかりませんでした。支払い元からの残高は減算されますが、受取人への送金は行われませんでした。',
            onConfirm: () => resetModal(),
            showCancelButton: false,
          });
          // この場合でも支払い元は処理を進める
        }
      }

      // バッチをコミット
      console.log("confirmPayment: Attempting to commit batch."); // デバッグログ
      await batch.commit();
      console.log("Firestore Batch: All operations committed successfully."); // デバッグログ

      setScannedAmount(null);
      setScannedStoreId(null);
      setScanInputAmount('');
      setLastTransactionDetails({ type: 'payment', amount: paymentAmount }); // 支払い完了のトランザクション詳細を記録
      setScanMode('initial');
      setScreen('支払い完了');
      resetModal();
      setToast({ message: `¥${paymentAmount.toLocaleString()}の支払いが完了しました！`, type: 'success' });
    } catch (error) {
      console.error("Error during payment (Batch failed):", error); // 変更ログ
      setModal({
        isOpen: true,
        title: '支払い失敗',
        message: `支払い処理中にエラーが発生しました。\n詳細: ${error.message || error.toString()}`, // エラー詳細を表示
        onConfirm: () => resetModal(),
        showCancelButton: false,
      });
      setToast({ message: `支払い失敗: ${error.message || '不明なエラー'}`, type: 'error' });
    }
  }, [balance, userId, db, appId, setModal, resetModal, setToast, setScreen, setScannedAmount, setScannedStoreId, setScanInputAmount, setLastTransactionDetails, setScanMode, userName, setBalance, setPoints]); // setBalance, setPointsを依存配列に追加

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
                lastTransactionDetails={lastTransactionDetails} // 追加: 最終トランザクション詳細を渡す
                currentBalance={balance} // 追加: 現在の残高を渡す
              />
            </div>
          )}
          {screen === '受け取る' && ( // ReceivePaymentScreenをレンダリング
            <ReceivePaymentScreen
              userId={userId}
              userName={userName}
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
          {(screen === 'home' || screen === 'スキャン' || screen === 'チャージ' || screen === 'ポイント' || screen === '取引履歴' || screen === 'notifications' || screen === 'account' || screen === '支払い' || screen === '支払い完了' || screen === '受け取る') && (
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
