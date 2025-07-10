// src/hooks/useAppInit.js

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
// ★★★ここを修正★★★
import { firebaseDb, firebaseAuth, firebaseApp } from '../firebase/firebaseConfig'; // Firebaseインスタンスをインポート

export const useAppInit = () => {
  const [userId, setUserId] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const [splashScreenTimerCompleted, setSplashScreenTimerCompleted] = useState(false);

  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const db = firebaseDb;
  const auth = firebaseAuth;
  const app = firebaseApp; // app インスタンスを取得
  const appId = 're-mat-mvp';

  // Firestoreリスナーのunsubscribe関数を保持する参照
  const unsubscribeRefs = useRef({});

  // Firebase初期化と認証のuseEffect
  useEffect(() => {
    if (!auth || !db || !app) { // app もチェックに追加
        console.log("useAppInit: Waiting for Firebase instances to be ready...");
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // ユーザーIDが変更された場合、古いFirestoreリスナーを解除
      if (user?.uid !== userId) {
        console.log("useAppInit: User ID changed or user logged out. Unsubscribing old Firestore listeners.");
        Object.values(unsubscribeRefs.current).forEach(unsub => unsub());
        unsubscribeRefs.current = {}; // リスナー参照をクリア
        setIsInitialDataLoaded(false); // データがリセットされるため、再度ロードが必要
        
        // 状態をリセット
        setBalance(0);
        setPoints(0);
        setUserName('');
        setProfileImage(null);
        setHistory([]);
        setNotifications([]);
      }

      if (user) {
        setUserId(user.uid);
        console.log("useAppInit: Auth state changed: Logged in as", user.uid, "Email Verified:", user.emailVerified);
      } else {
        console.log("useAppInit: Auth state changed: No user logged in. Attempting anonymous or custom token login.");
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInAnonymously(auth);
            setUserId(auth.currentUser.uid);
            console.log("useAppInit: Signed in anonymously (Canvas fallback):", auth.currentUser.uid);
            
            try {
              await auth.signInWithCustomToken(__initial_auth_token);
              setUserId(auth.currentUser.uid);
              console.log("useAppInit: Signed in with custom token:", auth.currentUser.uid);
            } catch (tokenError) {
              console.warn("useAppInit: Custom token login failed, remaining anonymous or trying default anonymous:", tokenError);
              if (!auth.currentUser || auth.currentUser.isAnonymous === false) {
                 await signInAnonymously(auth);
                 setUserId(auth.currentUser.uid);
                 console.log("useAppInit: Signed in anonymously (post-token fallback):", auth.currentUser.uid);
              }
            }
          } catch (error) {
            console.error("useAppInit: Firebase initialization error (initial anonymous or custom token failed):", error);
            await signInAnonymously(auth);
            setUserId(auth.currentUser.uid);
            console.log("useAppInit: Signed in anonymously (final fallback):", auth.currentUser.uid);
          }
        } else {
          await signInAnonymously(auth);
          setUserId(auth.currentUser.uid);
          console.log("useAppInit: Signed in anonymously (default):", auth.currentUser.uid);
        }
      }
      setIsFirebaseReady(true);
    });

    return () => {
      unsubscribeAuth();
      // コンポーネントアンマウント時にすべてのリスナーを解除
      Object.values(unsubscribeRefs.current).forEach(unsub => unsub());
      console.log("useAppInit: All Firestore listeners unsubscribed on component unmount.");
    };
  }, [auth, db, app, userId]); // app も依存配列に追加

  // 初期データ読み込みのuseEffect
  useEffect(() => {
    if (!db || !userId || !isFirebaseReady) {
      console.warn("useAppInit: Firestore listener not started: db =", db, "userId =", userId, "isFirebaseReady =", isFirebaseReady);
      return;
    }
    console.log("useAppInit: Starting Firestore listeners for userId:", userId);

    let profileLoaded = false;
    let historyLoaded = false;
    let notificationsLoaded = false;

    const checkAllInitialDataLoaded = () => {
      if (profileLoaded && historyLoaded && notificationsLoaded) {
        setIsInitialDataLoaded(true);
        console.log("useAppInit: All initial Firestore data loaded.");
      }
    };
    
    // プロフィールデータ
    const profileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
    unsubscribeRefs.current.profile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.balance || 0);
        setPoints(data.points || 0);
        setUserName(data.name || '');
        setProfileImage(data.profileImageUrl || null);
        console.log("useAppInit: Profile data updated:", data);
      } else {
        console.warn("useAppInit: User profile document does not exist, creating new one.");
        setDoc(profileDocRef, { balance: 0, points: 0, name: '', email: '', profileImageUrl: '', phoneNumber: '', address: {} }).catch(console.error); 
        setBalance(0);
        setPoints(0);
        setUserName('');
        setProfileImage(null);
      }
      if (!profileLoaded) {
        profileLoaded = true;
        checkAllInitialDataLoaded();
      }
    }, (error) => {
      console.error("useAppInit: Error fetching profile:", error);
      if (!profileLoaded) {
        profileLoaded = true;
        checkAllInitialDataLoaded();
      }
    });

    // 取引履歴データ
    const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
    unsubscribeRefs.current.history = onSnapshot(transactionsColRef, (snapshot) => {
      const fetchedHistory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date ? doc.data().date.toDate().toLocaleDateString('ja-JP') : '日付不明'
      })).sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
      setHistory(fetchedHistory);
      console.log("useAppInit: Transaction history updated:", fetchedHistory.length, "items.");
      if (!historyLoaded) {
        historyLoaded = true;
        checkAllInitialDataLoaded();
      }
    }, (error) => {
      console.error("useAppInit: Error fetching history:", error);
      if (!historyLoaded) {
        historyLoaded = true;
        checkAllInitialDataLoaded();
      }
    });

    // 通知データ
    const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    unsubscribeRefs.current.notifications = onSnapshot(notificationsColRef, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
      setNotifications(fetchedNotifications);
      console.log("useAppInit: Notifications updated:", fetchedNotifications.length, "items.");
      if (!notificationsLoaded) {
        notificationsLoaded = true;
        checkAllInitialDataLoaded();
      }
    }, (error) => {
      console.error("useAppInit: Error fetching notifications:", error);
      if (!notificationsLoaded) {
        notificationsLoaded = true;
        checkAllInitialDataLoaded();
      }
    });

    return () => {
      // userIdの変更でuseEffectが再実行される前に、以前のリスナーを解除
      console.log("useAppInit: Unsubscribing Firestore listeners due to userId change or unmount.");
      Object.values(unsubscribeRefs.current).forEach(unsub => unsub());
      unsubscribeRefs.current = {}; // リスナー参照をクリア
    };
  }, [db, userId, isFirebaseReady, appId, app]); // app を依存配列に追加

  // スプラッシュスクリーンの最低表示時間確保のuseEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashScreenTimerCompleted(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return {
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
    app,
    appId,
    setBalance,
    setPoints,
    setUserName,
    setProfileImage,
    setHistory,
    setNotifications,
    setUserId
  };
};
