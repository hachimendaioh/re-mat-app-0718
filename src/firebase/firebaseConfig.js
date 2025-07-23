// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app;
let db;
let auth;

// Firebaseを初期化し、各種インスタンスを取得する関数
const initializeFirebase = () => {
  let firebaseConfig;

  // Canvas環境で提供される__firebase_configが存在するかチェック
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = JSON.parse(__firebase_config);
  } else {
    // .env ファイルから環境変数を読み込む
    // REACT_APP_ プレフィックスが必須です。
    firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };
    console.warn("Using Firebase config from .env file. Ensure .env is correctly configured and not committed to Git.");
  }

  // Firebaseアプリを初期化
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized:', app.name);

  // FirestoreとAuthのインスタンスを取得
  db = getFirestore(app);
  auth = getAuth(app);

  return { app, db, auth };
};

// initializeFirebaseを一度だけ実行し、その結果をエクスポート
const firebaseInstances = initializeFirebase();

export const firebaseApp = firebaseInstances.app;
export const firebaseDb = firebaseInstances.db;
export const firebaseAuth = firebaseInstances.auth;
