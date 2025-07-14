// src/hooks/useAppInit.js

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { firebaseDb, firebaseAuth, firebaseApp as appInstance } from '../firebase/firebaseConfig'; // firebaseApp を appInstance としてインポート

/**
 * アプリケーションの初期化、Firebase認証、および初期データロードを管理するカスタムフック。
 * @returns {{
 * userId: string|null,
 * isFirebaseReady: boolean,
 * isInitialDataLoaded: boolean,
 * splashScreenTimerCompleted: boolean,
 * balance: number,
 * points: number,
 * userName: string,
 * profileImage: string|null,
 * history: Array<object>,\
 * notifications: Array<object>,\
 * auth: object,\
 * db: object,\
 * appId: string,\
 * firebaseApp: object, // ★追加: firebaseAppインスタンスも返す★
 * setUserId: (value: string|null) => void,\
 * setBalance: (value: number) => void,\
 * setPoints: (value: number) => void,\
 * setUserName: (value: string) => void,\
 * setProfileImage: (value: string|null) => void,\
 * setHistory: (value: Array<object>) => void,\
 * setNotifications: (value: Array<object>) => void
 * }} アプリケーションの初期状態とFirebaseインスタンス、および状態更新関数
 */
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
  const appId = typeof __app_id !== 'undefined' ? __app_id : 're-mat-mvp';

  // Firebase初期化と認証のuseEffect
  useEffect(() => {
    if (!auth || !db) {
        console.log("useAppInit: Waiting for Firebase instances to be ready...");
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ユーザーが既にログインしている場合（匿名、または認証済み）
        setUserId(user.uid);
        console.log("useAppInit: Auth state changed: Logged in as", user.uid, "Email Verified:", user.emailVerified);
      } else {
        // ユーザーがログインしていない場合、カスタムトークンまたは匿名でログインを試みる
        console.log("useAppInit: Auth state changed: No user logged in. Attempting anonymous or custom token login.");

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // Canvas環境でカスタムトークンが提供されている場合、まずカスタムトークンでログインを試みる
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
            setUserId(auth.currentUser.uid);
            console.log("useAppInit: Signed in with custom token:", auth.currentUser.uid);
          } catch (tokenError) {
            console.warn("useAppInit: Custom token login failed, falling back to anonymous:", tokenError);
            // カスタムトークンログインが失敗した場合、匿名ログインにフォールバック
            try {
              await signInAnonymously(auth);
              setUserId(auth.currentUser.uid);
              console.log("useAppInit: Signed in anonymously (fallback from custom token):", auth.currentUser.uid);
            } catch (anonError) {
              console.error("useAppInit: Final fallback to anonymous failed:", anonError);
            }
          }
        } else {
          // カスタムトークンが提供されていない場合、直接匿名ログインを試みる
          try {
            await signInAnonymously(auth);
            setUserId(auth.currentUser.uid);
            console.log("useAppInit: Signed in anonymously (default):", auth.currentUser.uid);
          } catch (error) {
            console.error("useAppInit: Anonymous sign-in failed:", error);
          }
        }
      }
      setIsFirebaseReady(true); // Firebaseインスタンスが利用可能になったことを示す
    });

    return () => unsubscribe();
  }, [auth, db]); // authとdbを依存配列に含める

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
    const unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
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
    const unsubscribeHistory = onSnapshot(transactionsColRef, (snapshot) => {
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
    const unsubscribeNotifications = onSnapshot(notificationsColRef, (snapshot) => {
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
      unsubscribeProfile();
      unsubscribeHistory();
      unsubscribeNotifications();
      console.log("useAppInit: Firestore listeners unsubscribed.");
    };
  }, [db, userId, isFirebaseReady, appId]);

  // スプラッシュスクリーンの最低表示時間確保のuseEffect (useAppInit内に移動)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashScreenTimerCompleted(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return {
    userId,
    setUserId, // setUserIdも返す
    isFirebaseReady,
    isInitialDataLoaded,
    splashScreenTimerCompleted,
    balance,
    points,
    userName,
    profileImage,
    history,
    notifications,
    auth, // Firebase Authインスタンスも返す
    db,   // Firebase Firestoreインスタンスも返す
    appId, // アプリIDも返す
    firebaseApp: appInstance, // ★ここを追加/修正: firebaseAppインスタンスを返す★
    setBalance,
    setPoints,
    setUserName,
    setProfileImage,
    setHistory,
    setNotifications
  };
};
