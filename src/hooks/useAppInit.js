// src/hooks/useAppInit.js

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { firebaseDb, firebaseAuth, firebaseApp as appInstance } from '../firebase/firebaseConfig';

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
 * history: Array<object>,
 * notifications: Array<object>,
 * auth: object,
 * db: object,
 * appId: string,
 * firebaseApp: object,
 * setUserId: (value: string|null) => void,
 * setBalance: (value: number) => void,
 * setPoints: (value: number) => void,
 * setUserName: (value: string) => void,
 * setProfileImage: (value: string|null) => void,
 * setHistory: (value: Array<object>) => void,
 * setNotifications: (value: Array<object>) => void,
 * isUserRegistered: boolean // ★追加: ユーザーが登録済みかどうかを示すフラグ
 * }} アプリケーションの初期状態とFirebaseインスタンス、および状態更新関数
 */
export const useAppInit = () => {
  const [userId, setUserId] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const [splashScreenTimerCompleted, setSplashScreenTimerCompleted] = useState(false);
  // ★追加: ユーザーが登録済みかどうかを示す状態
  const [isUserRegistered, setIsUserRegistered] = useState(false); 

  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const db = firebaseDb;
  const auth = firebaseAuth;
  const appId = typeof __app_id !== 'undefined' ? __app_id : 're-mat-mvp';

  // Firestoreリスナーのunsubscribe関数を保持するref
  const unsubscribeRefs = useRef([]);

  // Firebase初期化と認証のuseEffect
  useEffect(() => {
    if (!auth || !db) {
      console.log("useAppInit: Waiting for Firebase instances to be ready...");
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // 既存のFirestoreリスナーをすべてクリーンアップ
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];

      if (user) {
        setUserId(user.uid);
        // ユーザーが匿名でない場合、登録済みユーザーと判断
        setIsUserRegistered(!user.isAnonymous); 
        console.log("useAppInit: Auth state changed: Logged in as", user.uid, "Email Verified:", user.emailVerified, "Is Anonymous:", user.isAnonymous);
      } else {
        // ユーザーがログインしていない場合、カスタムトークンまたは匿名でログインを試みる
        console.log("useAppInit: Auth state changed: No user logged in. Attempting anonymous or custom token login.");

        // ログアウト後の状態をリセット
        setIsInitialDataLoaded(false);
        setBalance(0);
        setPoints(0);
        setUserName('');
        setProfileImage(null);
        setHistory([]);
        setNotifications([]);
        setUserId(null); // userIdをnullにリセット
        setIsUserRegistered(false); // ★追加: ユーザーが登録されていない状態にリセット

        // Canvas環境で提供される初期認証トークンを使用
        // このトークンは、ユーザーがCanvasにアクセスした際に自動的に生成されるカスタムトークンです。
        // 存在しない場合は匿名認証にフォールバックします。
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
            setUserId(auth.currentUser.uid);
            setIsUserRegistered(!auth.currentUser.isAnonymous); // 認証後、isUserRegisteredを更新
            console.log("useAppInit: Signed in with custom token:", auth.currentUser.uid);
          } catch (tokenError) {
            console.warn("useAppInit: Custom token login failed, falling back to anonymous:", tokenError);
            try {
              await signInAnonymously(auth);
              setUserId(auth.currentUser.uid);
              setIsUserRegistered(!auth.currentUser.isAnonymous); // 認証後、isUserRegisteredを更新
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
            setIsUserRegistered(!auth.currentUser.isAnonymous); // 認証後、isUserRegisteredを更新
            console.log("useAppInit: Signed in anonymously (default):", auth.currentUser.uid);
          } catch (error) {
            console.error("useAppInit: Anonymous sign-in failed:", error);
          }
        }
      }
      setIsFirebaseReady(true);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [auth, db]);

  // 初期データ読み込みのuseEffect (userIdに依存)
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
        // 新規ユーザーのためにドキュメントを作成
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

    // リスナーのunsubscribe関数をrefに保存
    unsubscribeRefs.current = [unsubscribeProfile, unsubscribeHistory, unsubscribeNotifications];

    return () => {
      // 次のuseEffectが実行される前に、以前のリスナーを停止
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [db, userId, isFirebaseReady, appId]);

  // スプラッシュスクリーンの最低表示時間確保のuseEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashScreenTimerCompleted(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return {
    userId,
    setUserId,
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
    firebaseApp: appInstance,
    setBalance,
    setPoints,
    setUserName,
    setProfileImage,
    setHistory,
    setNotifications,
    isUserRegistered // ★追加: ユーザーが登録済みかどうかを返す
  };
};
