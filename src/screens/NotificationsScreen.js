import React from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner'; // LoadingSpinnerをインポート

const NotificationsScreen = ({ notifications, handleNotificationRead, handleMarkAllNotificationsRead, isLoading, modal, onNotificationClick }) => {
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // 通知のタイプに応じてスタイルを返す関数
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'alert':
        return 'bg-red-200 text-red-800 border-l-4 border-red-500';
      case 'promotion':
        return 'bg-yellow-200 text-yellow-800 border-l-4 border-yellow-500';
      case 'charge': // チャージ通知のスタイル
        return 'bg-green-100 text-green-800 border-l-4 border-green-500';
      case 'payment': // 支払い通知のスタイル
        return 'bg-red-100 text-red-800 border-l-4 border-red-500';
      case 'receive': // 受取通知のスタイル
        return 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
      case 'info':
      default:
        return 'bg-gray-100 text-gray-800 border-l-4 border-gray-500'; // デフォルトスタイルを少し変更
    }
  };

  // 通知のタイプに応じてアイコンを返す関数
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert':
        return '🚨';
      case 'promotion':
        return '🎁';
      case 'charge': // チャージ通知のアイコン
        return '💰';
      case 'payment': // 支払い通知のアイコン
        return '💳';
      case 'receive': // 受取通知のアイコン
        return '🤝';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="p-4 text-white animate-fade-in font-inter">
      <h2 className="text-3xl font-bold mb-6 text-center">通知</h2>

      {unreadNotificationsCount > 0 && (
        <div className="text-center mb-6">
          <button
            onClick={handleMarkAllNotificationsRead}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            すべて既読にする ({unreadNotificationsCount})
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <p className="text-center text-gray-300">新しい通知はありません。</p>
      ) : (
        <ul className="bg-white rounded-xl shadow-lg text-black divide-y divide-gray-200">
          {notifications.map(notification => (
            <li
              key={notification.id}
              // onClickハンドラを追加し、onNotificationClickを呼び出す
              onClick={() => onNotificationClick(notification)}
              className={`p-4 flex items-start justify-between transition-all duration-300 
                ${notification.read ? 'bg-gray-100 text-gray-500' : 'font-semibold'}
                ${!notification.read ? getNotificationStyle(notification.type) : ''}
                rounded-lg m-2 cursor-pointer`}
            >
              <div className="flex items-start flex-grow">
                <span className="text-2xl mr-3 mt-1">{getNotificationIcon(notification.type)}</span>
                <span className="flex-grow">
                  <p className={`${notification.read ? 'text-gray-500' : 'text-gray-800'}`}>{notification.text}</p>
                  <p className="text-xs mt-1 text-gray-600">
                    {notification.timestamp ? new Date(notification.timestamp.toDate()).toLocaleString('ja-JP') : '日時不明'}
                  </p>
                </span>
              </div>
              {!notification.read && (
                <button
                  onClick={(e) => { // イベントの伝播を停止 (親のonClickが発火しないように)
                    e.stopPropagation(); 
                    handleNotificationRead(notification.id);
                  }}
                  className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors duration-200 shadow-sm flex-shrink-0"
                >
                  既読にする
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationsScreen;
