// src/screens/ReceivePaymentScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
// QRious はCDNで読み込まれるため、ここではインポート不要です。

import { getAuth } from 'firebase/auth'; // ユーザー認証状態の確認
import LoadingSpinner from '../components/common/LoadingSpinner'; // LoadingSpinnerをインポート

// デモ用のメニューデータを定義します
// 実際にはFirestoreなどから取得することを想定
const demoMenuItems = [
  { id: '1', name: 'オーガニックコーヒー', price: 500, category: 'ドリンク' },
  { id: '2', name: '特製クロワッサン', price: 350, category: 'フード' },
  { id: '3', name: '季節のスペシャルサンド', price: 850, category: 'フード' },
  { id: '4', name: 'フレッシュジュース', price: 600, category: 'ドリンク' },
  { id: '5', name: '本日のケーキ', price: 480, category: 'デザート' },
];

const ReceivePaymentScreen = ({ userId, userName, setScreen, setModal }) => {
  const [qrData, setQrData] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedItems, setSelectedItems] = useState({});
  const [qrError, setQrError] = useState('');
  const [showMenu, setShowMenu] = useState(true); // メニュー表示/金額直接入力を切り替える
  const [directAmount, setDirectAmount] = useState(''); // 金額直接入力用
  const [isQrGenerated, setIsQrGenerated] = useState(false); 

  // QRコードを描画するcanvas要素への参照
  const qrCanvasRef = useRef(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isAnonymousUser = currentUser?.isAnonymous;

  // 合計金額を計算する関数
  const calculateTotal = useCallback(() => {
    let total = 0;
    Object.keys(selectedItems).forEach(itemId => {
      const item = demoMenuItems.find(i => i.id === itemId);
      if (item) {
        total += item.price * selectedItems[itemId];
      }
    });
    setTotalAmount(total);
  }, [selectedItems]);

  useEffect(() => {
    if (showMenu) {
      calculateTotal();
    }
  }, [selectedItems, showMenu, calculateTotal]);

  // qrDataが変更されたときにQRコードをcanvasに描画
  useEffect(() => {
    console.log("ReceivePaymentScreen: useEffect for qrData triggered. qrData:", qrData);
    if (qrData && qrCanvasRef.current) {
      console.log("ReceivePaymentScreen: Attempting to draw QR code on canvas.");
      if (window.QRious) {
        new window.QRious({
          element: qrCanvasRef.current,
          value: qrData,
          size: 300, // QRコードのサイズ
          background: '#FFFFFF', // 背景色
          foreground: '#000000', // 前景色
          level: 'H' // エラー訂正レベル
        });
        setIsQrGenerated(true);
        console.log("ReceivePaymentScreen: QR code drawn successfully.");
      } else {
        console.error("ReceivePaymentScreen: window.QRious is not defined. Make sure QRious CDN is loaded in index.html.");
        setQrError("QRコードライブラリが読み込まれていません。");
        setIsQrGenerated(false);
      }
    } else {
      console.log("ReceivePaymentScreen: qrData is empty or qrCanvasRef.current is null. Not drawing QR code.");
      setIsQrGenerated(false);
    }
  }, [qrData]);

  const handleToggleItem = (itemId) => {
    setSelectedItems(prevItems => {
      const newItems = { ...prevItems };
      if (newItems[itemId]) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = 1;
      }
      return newItems;
    });
  };

  const handleGenerateQrCode = () => {
    console.log("ReceivePaymentScreen: handleGenerateQrCode called.");

    if (isAnonymousUser) {
      console.log("ReceivePaymentScreen: Anonymous user detected. Showing restriction modal.");
      setModal({
        isOpen: true,
        title: '機能制限',
        message: 'QRコードを生成するには、アカウント登録が必要です。',
        onConfirm: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          setScreen('register');
        },
        showCancelButton: false,
      });
      return;
    }

    let finalAmount = showMenu ? totalAmount : parseInt(directAmount, 10);
    console.log("ReceivePaymentScreen: Final amount calculated:", finalAmount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      console.log("ReceivePaymentScreen: Invalid amount. Setting QR error.");
      setQrError('有効な金額を入力またはメニューを選択してください。');
      return;
    }

    let qrPayload = {
      receiverId: userId,
      receiverName: userName,
      amount: finalAmount,
    };
    
    if (showMenu) {
        const itemsList = Object.keys(selectedItems).map(itemId => {
            const item = demoMenuItems.find(i => i.id === itemId);
            return {
                name: item.name,
                price: item.price,
                quantity: selectedItems[itemId],
            };
        });
        qrPayload.items = itemsList;
    }
    console.log("ReceivePaymentScreen: QR Payload:", qrPayload);

    try {
      const payloadString = JSON.stringify(qrPayload);
      console.log("ReceivePaymentScreen: Payload stringified:", payloadString);
      
      const encoder = new TextEncoder();
      const encodedBytes = encoder.encode(payloadString);
      const encodedPayload = btoa(String.fromCharCode(...encodedBytes));
      console.log("ReceivePaymentScreen: Payload encoded to Base64:", encodedPayload);

      setQrData(encodedPayload);
      setQrError('');
      setIsQrGenerated(true); 
      console.log("ReceivePaymentScreen: setQrData and setIsQrGenerated(true) called.");
    } catch (error) {
      console.error("QR Code generation failed:", error);
      setQrError(`QRコードの生成に失敗しました: ${error.message || error.toString()}`);
      setIsQrGenerated(false);
    }
  };

  const handleCopyQrData = () => {
    if (qrData) {
      navigator.clipboard.writeText(qrData).then(() => {
        setModal({
          isOpen: true,
          title: 'コピー完了',
          message: 'QRコードのデータがクリップボードにコピーされました。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }).catch(err => {
        console.error("Failed to copy QR data to clipboard:", err);
        setModal({
          isOpen: true,
          title: 'コピー失敗',
          message: 'QRコードのデータのコピーに失敗しました。お手数ですが、手動でコピーしてください。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      });
    } else {
      setModal({
        isOpen: true,
        title: 'コピー失敗',
        message: 'コピーするQRデータがありません。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    }
  };

  const handleDownloadQrCode = () => {
    if (qrCanvasRef.current && isQrGenerated) {
      const url = qrCanvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `remat_qr_code_${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setModal({
        isOpen: true,
        title: 'ダウンロード完了',
        message: 'QRコード画像をダウンロードしました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } else {
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'QRコードの画像をダウンロードできませんでした。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    }
  };

  return (
    <div className="p-4 text-white text-center flex flex-col items-center font-inter animate-fade-in">
      <h2 className="text-3xl font-bold mb-6">QRコードで受け取る</h2>

      {isAnonymousUser && (
        <div className="bg-yellow-600 rounded-xl p-4 mb-4 w-full max-w-md text-sm">
          <p>ゲストユーザーはQRコードを生成できません。</p>
          <p>アカウントを登録して、この機能をご利用ください。</p>
        </div>
      )}

      {/* QRコード表示エリア */}
      {/* 親要素は中央寄せとレスポンシブ性を保ち、内側のdivでQRコードの固定サイズとパディングを管理する */}
      <div className={`relative mb-6 w-full max-w-sm flex items-center justify-center animate-slide-in-right ${isAnonymousUser ? 'opacity-50' : ''} mx-auto`}>
        {/* このdivがQRコードの表示領域と背景、パディングを定義する */}
        {/* QRコード(256px) + パディング(24px*2) = 304px */}
        <div className="relative bg-gray-700 rounded-lg p-6 flex items-center justify-center" style={{ width: '304px', height: '304px' }}>
          {isQrGenerated ? (
            // QRiousはcanvasに直接描画するため、canvas要素を配置
            <canvas ref={qrCanvasRef} width="300" height="300" className="rounded-lg block"></canvas>
          ) : (
            // QRコードが生成されていない場合のプレースホルダー
            <div className="w-64 h-64 bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-lg">QRコードがここに表示されます</span>
            </div>
          )}
        </div>
      </div>

      <div className={`w-full max-w-sm mb-6 ${isAnonymousUser ? 'opacity-50' : ''}`}>
        {/* メニュー切り替えボタン */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setShowMenu(true)}
            className={`px-4 py-2 rounded-l-full text-sm font-semibold transition-all duration-300 ${showMenu ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            メニューから選択
          </button>
          <button
            onClick={() => setShowMenu(false)}
            className={`px-4 py-2 rounded-r-full text-sm font-semibold transition-all duration-300 ${!showMenu ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            金額を直接入力
          </button>
        </div>

        {showMenu ? (
          // メニュー選択モード
          <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-blue-300">メニュー</h3>
            {demoMenuItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleToggleItem(item.id)}
                className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-colors duration-200
                  ${selectedItems[item.id] ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                <span className="text-sm font-semibold">{item.name}</span>
                <span className="text-sm">¥{item.price.toLocaleString()}</span>
              </div>
            ))}
            <hr className="border-gray-600 my-4" />
            <div className="flex justify-between items-center text-xl font-bold">
              <span>合計金額</span>
              <span>¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          // 金額直接入力モード
          <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-blue-300">金額を直接入力</h3>
            <input
              type="number"
              value={directAmount}
              onChange={(e) => {
                setDirectAmount(e.target.value);
                setQrError('');
              }}
              placeholder="¥"
              className="w-full p-3 rounded-lg text-black text-2xl font-bold text-center mb-4 bg-gray-100"
              disabled={isAnonymousUser}
            />
          </div>
        )}
      </div>

      {qrError && <p className="text-red-400 mb-4">{qrError}</p>}

      {/* アクションボタン */}
      <div className={`w-full max-w-sm flex flex-col space-y-4 ${isAnonymousUser ? 'opacity-50' : ''}`}>
        <button
          onClick={handleGenerateQrCode}
          className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
          disabled={isAnonymousUser}
        >
          QRコードを生成
        </button>
        {isQrGenerated && (
          <>
            <button
              onClick={handleCopyQrData}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
            >
              QRデータをコピー
            </button>
            <button
              onClick={handleDownloadQrCode}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
            >
              QRコードをダウンロード
            </button>
          </>
        )}
        <button
          onClick={() => setScreen('home')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default ReceivePaymentScreen;
