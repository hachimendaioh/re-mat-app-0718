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
    // ローカル開発やFirebase Hostingなど、__firebase_configが提供されない場合のフォールバック設定
    // TODO: ここにあなたのFirebaseプロジェクトの実際の認証情報（FirebaseコンソールのWebアプリ設定からコピーしたもの）を貼り付けてください。
    // WARNING: 本番環境ではこのファイルを直接Git管理せず、環境変数などを用いてください。
    firebaseConfig = {
      apiKey: "AIzaSyD4Xt7J22K6VCumRthjLA2NfMlST3FZ-X8",
      authDomain: "re-mat-mvp.firebaseapp.com",
      projectId: "re-mat-mvp",
      storageBucket: "re-mat-mvp.firebasestorage.app",
      messagingSenderId: "697223246661",
      appId: "1:697223246661:web:b662f5baad71145a37842c",
      measurementId: "G-JS1FJ3SEWQ"
    };
    console.warn("Using fallback firebaseConfig. Please ensure this is correct and replace YOUR_... placeholders.");
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
