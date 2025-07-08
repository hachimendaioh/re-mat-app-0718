import React, { useEffect, useState } from 'react';

const ToastNotification = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  // 通知タイプに応じたスタイル
  const getStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  useEffect(() => {
    // 3秒後に自動的に非表示にするタイマー
    const timer = setTimeout(() => {
      setIsVisible(false);
      // アニメーションが完了するのを待ってから onClose を呼び出す
      const fadeOutTimer = setTimeout(() => {
        onClose();
      }, 300); // フェードアウトアニメーションの時間と合わせる

      return () => clearTimeout(fadeOutTimer);
    }, 3000); // 3秒表示

    return () => clearTimeout(timer);
  }, [onClose]);

  // アニメーションクラス
  const animationClass = isVisible ? 'animate-slide-down' : 'animate-slide-up-out';

  return (
    <div className={`fixed top-0 left-0 w-full p-4 text-white text-center shadow-lg transform z-50 rounded-b-lg font-inter ${getStyle()} ${animationClass}`}>
      <div className="flex items-center justify-between">
        <span className="flex-grow">{message}</span>
        <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="ml-4 text-white text-xl font-bold">
          &times;
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;
