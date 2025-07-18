import React from 'react';
import { signOut, signInAnonymously } from 'firebase/auth'; // ログアウトと匿名ログイン用

// アイコンパスを修正
const homeIcon = "/icons/HOME.png";
const accountIcon = "/icons/account.png";
const infoIcon = "/icons/info.png";
const chargeIcon = "/icons/charge.png"; // charge.png をチャージ用アイコンとしてインポート
const receiveIcon = "/icons/receive.png"; // ★追加: 新しい受け取るアイコンのパス
const historyIcon = "/icons/history.png";
const pointsIcon = "/icons/points.png";
const scanIcon = "/icons/scan.png"; // これはスキャン画面用なのでそのまま

const SideDrawer = ({ isOpen, onClose, setScreen, auth, userId, userName, setModal }) => {
  const isAnonymousUser = auth?.currentUser?.isAnonymous;

  const handleLogout = async () => {
    onClose(); // メニューを閉じる
    setModal({
      isOpen: true,
      title: 'ログアウト確認',
      message: 'ログアウトしますか？\nゲストユーザーとして続行する場合は、残高やポイントは保存されません。',
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        try {
          await signOut(auth); // Firebaseからログアウト
          await signInAnonymously(auth); // 匿名ユーザーとして再ログイン
          setScreen('guest_intro'); // ゲストログイン画面へ強制的に遷移
        } catch (error) {
          console.error("Logout failed:", error);
          setModal({
            isOpen: true,
            title: 'ログアウト失敗',
            message: 'ログアウト中にエラーが発生しました。',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
        }
      },
      onCancel: () => setModal(prev => ({ ...prev, isOpen: false })),
      showCancelButton: true,
    });
  };

  const navigateAndClose = (screenName) => {
    setScreen(screenName);
    onClose(); // メニューを閉じる
  };

  return (
    <>
      {/* オーバーレイ */}
      {/* isOpen が true の場合のみ表示され、クリックで閉じる */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300"
          onClick={onClose}
        ></div>
      )}

      {/* サイドメニュー本体 */}
      {/* isOpen が false の場合、transform で画面外に移動し、pointer-events-none でクリック無効 */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-2xl z-30 transform transition-transform duration-300 ease-in-out font-inter
          ${isOpen ? 'translate-x-0 visible' : '-translate-x-full invisible pointer-events-none'}`}
        aria-hidden={!isOpen} // アクセシビリティのため
      >
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-4xl text-blue-400 mr-3">👤</span>
            <div className="text-white">
              <p className="font-bold text-lg">{userName || (isAnonymousUser ? 'ゲスト' : 'ユーザー')}</p>
              <p className="text-sm text-gray-400">ID: {userId ? (isAnonymousUser ? '匿名ユーザー' : userId.substring(0, 8) + '...') : '未取得'}</p>
            </div>
          </div>
          {/* 閉じるボタン */}
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => navigateAndClose('home')}
            className="w-full flex items-center p-3 rounded-lg text-white hover:bg-gray-700 transition-colors duration-200 active:scale-95"
          >
            <img src={homeIcon} alt="Home" className="w-6 h-6 mr-3" />
            <span>ホーム</span>
          </button>

          <button
            onClick={() => navigateAndClose('account')}
            className="w-full flex items-center p-3 rounded-lg text-white hover:bg-gray-700 transition-colors duration-200 active:scale-95"
          >
            <img src={accountIcon} alt="Account" className="w-6 h-6 mr-3" />
            <span>アカウント設定</span>
          </button>

          {!isAnonymousUser && ( // ログイン済みユーザーのみ表示
            <>
              <button
                onClick={() => navigateAndClose('チャージ')}
                className="w-full flex items-center p-3 rounded-lg text-white hover:bg-gray-700 transition-colors duration-200 active:scale-95"
              >
                <img src={chargeIcon} alt="Charge" className="w-6 h-6 mr-3" /> {/* chargeIcon に変更 */}
                <span>チャージ</span>
              </button>

              {/* QRで受け取るボタン */}
              <button
                onClick={() => navigateAndClose('受け取る')}
                className="w-full flex items-center p-3 rounded-lg text-white hover:bg-gray-700 transition-colors duration-200 active:scale-95"
              >
                <img src={receiveIcon} alt="Receive by QR" className="w-6 h-6 mr-3" />
                <span>QRで受け取る</span>
              </button>

              <button
                onClick={() => navigateAndClose('ポイント')}
                className="w-full flex items-center p-3 rounded-lg text-white hover:bg-gray-700 transition-colors duration-200 active:scale-95"
              >
                <img src={pointsIcon} alt="Points" className="w-6 h-6 mr-3" />
                <span>ポイント</span>
              </button>

              <button
                onClick={() => navigateAndClose('取引履歴')}
                className="w-full flex items-center p-3 rounded-lg text-white hover:bg-gray-700 transition-colors duration-200 active:scale-95"
              >
                <img src={historyIcon} alt="History" className="w-6 h-6 mr-3" />
                <span>取引履歴</span>
              </button>

              <button
                onClick={() => navigateAndClose('notifications')}
                className="w-full flex items-center p-3 rounded-lg text-white hover:bg-gray-700 transition-colors duration-200 active:scale-95"
              >
                <img src={infoIcon} alt="Notifications" className="w-6 h-6 mr-3" />
                <span>通知</span>
              </button>
            </>
          )}

          <hr className="border-gray-700 my-2" />

          {isAnonymousUser ? (
            <button
              onClick={() => navigateAndClose('guest_intro')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-all duration-300 transform active:scale-95"
            >
              アカウント登録 / ログイン
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-all duration-300 transform active:scale-95"
            >
              ログアウト
            </button>
          )}

          {/* その他のメニュー項目（例: ヘルプ、設定など）をここに追加可能 */}
        </nav>
      </div>
    </>
  );
};

export default SideDrawer;