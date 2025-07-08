import React, { useState, useCallback, useEffect } from 'react';

const ReceivePaymentScreen = ({ userId, userName, setScreen, setModal }) => {
  const [amount, setAmount] = useState(''); // ユーザーが入力する金額
  const [qrData, setQrData] = useState(''); // QRコードに埋め込むデータ
  const [qrError, setQrError] = useState(''); // QRコード生成時のエラーメッセージ

  // QRコードデータを生成する関数
  // ★変更点: useCallbackから外し、通常の関数として定義
  const generateQrCodeData = () => {
    if (!userId) {
      setQrError("ユーザーIDが取得できません。ログイン状態を確認してください。");
      return;
    }

    let dataToEmbed = {
      receiverId: userId,
      receiverName: userName || '匿名ユーザー' // 受取人名も埋め込む
    };

    const parsedAmount = parseInt(amount, 10);
    if (amount && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setQrError("有効な金額（1円以上の数字）を入力してください。");
      return;
    }
    if (parsedAmount > 0) {
      dataToEmbed.amount = parsedAmount;
    }

    try {
      const jsonString = JSON.stringify(dataToEmbed);
      // JSON文字列をBase64エンコードしてからQRコードに埋め込む
      const encodedData = btoa(unescape(encodeURIComponent(jsonString))); // UTF-8 -> Percent-encoding -> Base64
      setQrData(encodedData);
      setQrError(''); // エラーをクリア
    } catch (e) {
      console.error("QRコードデータ生成エラー:", e);
      setQrError("QRコードデータの生成中にエラーが発生しました。");
    }
  }; // ★変更点: 依存配列を削除

  // コンポーネントがマウントされたとき、または金額が変更されたときにQRコードを自動生成
  useEffect(() => {
    generateQrCodeData();
  }, [amount, userId, userName, setQrError]); // ★変更点: generateQrCodeDataを依存配列から削除し、直接の依存関係を追加

  // SVGでQRコードを描画するコンポーネント (簡単なSVG生成)
  const QrCodeSvg = ({ text, size = 256, setModal }) => { 
    const [svgString, setSvgString] = useState('');

    useEffect(() => {
      if (text) {
        try {
          if (window.QRious) {
            const qr = new window.QRious({
              value: text,
              size: size,
              level: 'H', // エラー訂正レベル
              foreground: 'black', // QRコードの色
              background: 'white'  // 背景色
            });
            setSvgString(qr.toDataURL()); // Data URL形式でSVGを取得
          } else {
            console.error("QRious library not loaded. Please include it in index.html.");
            setSvgString(''); // エラー時は空に
            if (setModal) { 
              setModal({ 
                isOpen: true,
                title: 'ライブラリ不足',
                message: 'QRコード生成に必要なライブラリが読み込まれていません。\n\nindex.htmlにQRiousのスクリプトタグを追加してください。',
                onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
                showCancelButton: false,
              });
            }
          }
        } catch (e) {
          console.error("QRious SVG生成エラー:", e);
          setSvgString('');
        }
      } else {
        setSvgString('');
      }
    }, [text, size, setModal]);

    if (!svgString) {
      return <div className="text-gray-400">QRコードを生成できません。</div>;
    }

    return <img src={svgString} alt="QR Code" className="w-full h-auto max-w-[256px] rounded-lg shadow-xl" />;
  };


  return (
    <div className="p-4 text-white text-center flex flex-col items-center justify-center min-h-[calc(100vh-120px)] font-inter bg-gray-900">
      <h2 className="text-3xl font-bold mb-6 animate-fade-in-up">QRコードで支払いを受け取る</h2>

      <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm mb-6 animate-slide-in-right">
        <p className="text-gray-300 text-lg mb-2">あなたのRe-Mat ID</p>
        <p className="text-white text-xl font-bold break-all mb-4">{userId || '未取得'}</p>

        <input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setQrError(''); // 入力変更でエラーをクリア
          }}
          onBlur={generateQrCodeData} // 入力欄からフォーカスが外れたらQRコードを更新
          placeholder="金額を入力 (任意)"
          className="text-black text-center text-2xl font-bold w-full p-3 rounded-lg mb-4 bg-gray-100 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          inputMode="numeric"
          pattern="[0-9]*"
        />

        {qrError && (
          <p className="text-red-400 mt-2 text-sm animate-pulse">{qrError}</p>
        )}
        
        {/* テスト用QRコード生成ボタン */}
        <button
          onClick={() => {
            // テスト用QRコードもBase64エンコード
            const testData = JSON.stringify({receiverId: "TEST_ID", receiverName: "テストユーザー", amount: 123});
            setQrData(btoa(unescape(encodeURIComponent(testData))));
            setQrError('');
            setAmount(''); // 金額入力欄をクリア
          }}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95"
        >
          テスト用QRコードを生成
        </button>

      </div>

      {/* QRコードに埋め込むデータ文字列をデバッグ表示 */}
      {qrData && (
        <div className="bg-gray-700 text-white p-3 rounded-lg text-sm mb-4 w-full max-w-sm break-all">
          <p className="font-bold mb-1">QR埋め込みデータ (Base64エンコード済み):</p>
          <p className="text-gray-300 select-all">{qrData}</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-lg mb-6 animate-bounce-in">
        {qrData ? (
          <QrCodeSvg text={qrData} size={256} setModal={setModal} /> 
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-200 rounded-lg text-gray-500">
            QRコードを生成中...
          </div>
        )}
      </div>

      <button
        onClick={() => setScreen('home')}
        className="bg-gray-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
      >
        ホームに戻る
      </button>
    </div>
  );
};

export default ReceivePaymentScreen;
