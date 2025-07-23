import React, { useState, useCallback, useEffect, useRef } from 'react';
import QrCodeScanner from './QrCodeScanner';
import { doc, getDoc } from 'firebase/firestore'; // Firestoreからドキュメントを取得するために追加

const ScanScreen = ({
  scannedAmount,
  setScannedAmount,
  scanInputAmount,
  setScanInputAmount,
  balance,
  scanError,
  setScanError,
  handleScanStart,
  scanMode,
  setScanMode,
  setModal,
  setScreen,
  setScannedStoreId,
  db, // Firestoreインスタンスを受け取る
  appId, // アプリIDを受け取る
}) => {

  const qrScannerRef = useRef(null); 

  useEffect(() => {
    if (typeof setScannedAmount === 'function') setScannedAmount(null);
    if (typeof setScanInputAmount === 'function') setScanInputAmount('');
    if (typeof setScanError === 'function') setScanError('');
    if (typeof setScannedStoreId === 'function') setScannedStoreId(null);

    return () => {
      if (qrScannerRef.current && qrScannerRef.current.stopCamera) {
        qrScannerRef.current.stopCamera();
      }
    };
  }, [setScannedAmount, setScanInputAmount, setScanError, setScannedStoreId, scanMode]);

  const handleCaptureImage = useCallback(() => {
    if (qrScannerRef.current && qrScannerRef.current.getCanvas) {
      const canvas = qrScannerRef.current.getCanvas();
      if (canvas) {
        try {
          const imageDataUrl = canvas.toDataURL('image/png');
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(`<img src="${imageDataUrl}" alt="Captured Camera Feed" style="max-width: 100%; height: auto;">`);
            newWindow.document.title = "Captured Camera Feed";
          } else {
            if (typeof setModal === 'function') {
              setModal({
                isOpen: true,
                title: 'エラー',
                message: 'ポップアップウィンドウを開けませんでした。ブラウザの設定を確認してください。',
                onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
                showCancelButton: false,
              });
            }
          }
        } catch (e) {
          console.error("Failed to capture image from canvas:", e);
          if (typeof setModal === 'function') {
            setModal({
              isOpen: true,
              title: 'キャプチャエラー',
              message: `カメラ映像のキャプチャに失敗しました。\n詳細: ${e.message || e.toString()}`,
              onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
              showCancelButton: false,
            });
          }
        }
      } else {
        console.warn("Canvas element not available for capture.");
        if (typeof setModal === 'function') {
          setModal({
            isOpen: true,
            title: 'キャプチャエラー',
            message: 'カメラ映像が準備できていません。',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
        }
      }
    } else {
      console.warn("qrScannerRef.current or getCanvas is not available.");
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: 'キャプチャエラー',
          message: 'カメラコンポーネントが準備できていません。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    }
  }, [setModal]);


  const onResult = useCallback(async (result, error) => {
    console.log("ScanScreen Debug: onResult called. result:", result, "error:", error);
    
    if (result && result.text) { 
      let rawScannedData = result.text;
      let parsedAmount = null;
      let parsedReceiverId = null; 
      let parsedReceiverName = null; 
      let parsedItems = null;
      let orderId = null; 
      let displayData = rawScannedData; 

      console.log("ScanScreen Debug: Raw scanned data:", rawScannedData);

      try {
        let decodedData;
        try {
          const binaryString = atob(rawScannedData);
          const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
          decodedData = new TextDecoder('utf-8').decode(bytes);
        } catch (atobError) {
          console.error("ScanScreen Debug: Base64 decoding or UTF-8 decoding failed:", atobError);
          decodedData = rawScannedData; 
        }

        console.log("ScanScreen Debug: Decoded or raw data for JSON parse:", decodedData);

        const jsonData = JSON.parse(decodedData);
        console.log("ScanScreen Debug: Parsed JSON data:", jsonData);

        if (jsonData && jsonData.receiverId) {
          console.log("ScanScreen Debug: Data contains receiverId.");
          parsedReceiverId = jsonData.receiverId;
          parsedReceiverName = jsonData.receiverName || '不明な受取人'; 
          orderId = jsonData.orderId || null; 

          // orderIdがあればFirestoreから詳細情報を取得
          if (orderId && db && appId) {
            console.log("ScanScreen Debug: orderId found. Attempting to fetch order details from Firestore.");
            const orderDocRef = doc(db, `artifacts/${appId}/orders/${orderId}`);
            const orderDocSnap = await getDoc(orderDocRef);

            if (orderDocSnap.exists()) {
              const orderData = orderDocSnap.data();
              console.log("ScanScreen Debug: Order data fetched from Firestore:", orderData);
              parsedItems = orderData.items || null;
              parsedAmount = orderData.amount || 0;
              parsedReceiverName = orderData.receiverName || parsedReceiverName; 
            } else {
              console.warn("ScanScreen Debug: Order document not found for orderId:", orderId);
              parsedAmount = typeof jsonData.amount === 'number' && jsonData.amount > 0 ? jsonData.amount : 0;
            }
          } else {
            // orderIdがない場合、QRコードに直接含まれるamountとitemsを使用
            if (jsonData.items && Array.isArray(jsonData.items)) {
              parsedItems = jsonData.items;
              parsedAmount = parsedItems.reduce((total, item) => {
                const price = typeof item.price === 'number' && item.price > 0 ? item.price : 0;
                const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
                return total + (price * quantity);
              }, 0);
              console.log("ScanScreen Debug: Valid items found in QR. Calculated total amount:", parsedAmount);
            } else if (typeof jsonData.amount === 'number' && jsonData.amount > 0) {
              parsedAmount = jsonData.amount;
              console.log("ScanScreen Debug: No items in QR, but valid amount found:", parsedAmount);
            }
          }

          // receiverIdのuserProfileからstoreNameを取得し、parsedReceiverNameを上書きする
          if (parsedReceiverId && db && appId) {
            try {
              const receiverProfileRef = doc(db, `artifacts/${appId}/users/${parsedReceiverId}/profile/userProfile`);
              console.log("ScanScreen Debug: Attempting to fetch receiver profile for receiverId:", parsedReceiverId);
              const receiverProfileSnap = await getDoc(receiverProfileRef);
              
              if (receiverProfileSnap.exists()) {
                const receiverProfileData = receiverProfileSnap.data();
                console.log("ScanScreen Debug: Receiver profile data exists. isStore:", receiverProfileData.isStore, "storeName:", receiverProfileData.storeName); // ★追加ログ★
                if (receiverProfileData.isStore && receiverProfileData.storeName) {
                  console.log("ScanScreen Debug: Receiver is a store. Using storeName:", receiverProfileData.storeName);
                  parsedReceiverName = receiverProfileData.storeName; // 店舗名を優先
                } else {
                  console.log("ScanScreen Debug: Receiver is not a store or storeName not found. Using receiverName from QR/Order.");
                }
              } else {
                console.warn("ScanScreen Debug: Receiver profile document does not exist for receiverId:", parsedReceiverId);
              }
            } catch (profileError) {
              console.error("ScanScreen Debug: Error fetching receiver profile for storeName:", profileError);
              // プロフィール取得エラー時は、QRコードやOrderから取得したreceiverNameをそのまま使用
            }
          }
          
          if (!parsedAmount || parsedAmount <= 0) {
             console.log("ScanScreen Debug: ReceiverId found, but amount is invalid or missing.");
             throw new Error("Invalid amount or items in QR code data.");
          }

          if (parsedReceiverId) {
            console.log("ScanScreen Debug: Initiating screen transition to payment_confirmation with:", {
              scannedAmount: parsedAmount,
              scannedStoreId: { 
                id: parsedReceiverId, 
                name: parsedReceiverName, 
                items: parsedItems, 
                orderId: orderId 
              }
            });

            if (typeof setScannedAmount === 'function') setScannedAmount(parsedAmount);
            if (typeof setScanInputAmount === 'function') setScanInputAmount(String(parsedAmount));
            if (typeof setScannedStoreId === 'function') setScannedStoreId({ id: parsedReceiverId, name: parsedReceiverName, items: parsedItems, orderId: orderId });
            if (typeof setScanMode === 'function') setScanMode('initial');
            if (typeof setScanError === 'function') setScanError('');
            if (typeof setScreen === 'function') setScreen('payment_confirmation');
            console.log("ScanScreen Debug: Successful QR code processing (receiverId path).");
            return;
          }
        } 
        else {
          console.log("ScanScreen Debug: Data does not contain receiverId. Attempting to parse as single amount.");
          if (typeof jsonData.amount === 'number' && jsonData.amount > 0) {
            parsedAmount = jsonData.amount;
            parsedReceiverName = jsonData.storeName || '不明な店舗'; 
          } else {
            throw new Error("Invalid amount in JSON data.");
          }
        }
      } catch (parseError) {
        console.log("ScanScreen Debug: JSON parse or data validation error:", parseError);
        const cleanedData = rawScannedData.replace(/[^0-9]/g, '').trim();
        parsedAmount = parseInt(cleanedData, 10);
        parsedReceiverName = '不明な店舗';
        displayData = rawScannedData;
      }

      console.log("ScanScreen Debug: Final parsedAmount:", parsedAmount);

      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        console.log("ScanScreen Debug: Valid amount found (non-receiverId path). Initiating transition.");
        if (typeof setScannedAmount === 'function') setScannedAmount(parsedAmount);
        if (typeof setScanInputAmount === 'function') setScanInputAmount(String(parsedAmount));
        if (typeof setScannedStoreId === 'function') setScannedStoreId({ id: null, name: parsedReceiverName, items: null, orderId: null });
        if (typeof setScanMode === 'function') setScanMode('initial');
        if (typeof setScanError === 'function') setScanError('');
        if (typeof setScreen === 'function') setScreen('payment_confirmation');
      } else {
        console.log("ScanScreen Debug: Invalid QR code data or amount. Showing error modal.");
        if (typeof setScanError === 'function') setScanError("無効なQRコードデータです。有効な金額または受取人情報が含まれていません。");
        if (typeof setScanMode === 'function') setScanMode('initial');
        if (typeof setModal === 'function') {
          setModal({
            isOpen: true,
            title: 'QRデータエラー',
            message: `スキャンしたQRコードに有効な金額または受取人情報が含まれていませんでした。\n\n検出されたデータ: "${displayData}"\n解析結果: ${isNaN(parsedAmount) ? '数値に変換できませんでした' : parsedAmount}`,
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
        }
      }
    } else { 
      console.log("ScanScreen Debug: No result or result.text found. Showing scan failed modal.");
      if (typeof setScanError === 'function') setScanError("QRコードが検出されませんでした。またはデコードに失敗しました。");
      if (typeof setScanMode === 'function') setScanMode('initial');
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: 'スキャン失敗',
          message: 'QRコードが検出されなかったか、読み取りに失敗しました。カメラのピントや照明を確認してください。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    }

    if (error) {
      console.error("ScanScreen Debug: QR code scan result processing error (onResult error object):", error);
    }
  }, [setScannedAmount, setScanInputAmount, setScanMode, setScreen, setScanError, setModal, setScannedStoreId, balance, db, appId]);

  const onError = useCallback((error) => {
    console.error("ScanScreen received error (onError callback):", error);
    if (typeof setScanMode === 'function') setScanMode('initial'); 

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      if (typeof setScanError === 'function') setScanError("カメラへのアクセスが拒否されました。設定を確認してください。");
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: 'カメラアクセス拒否',
          message: 'カメラへのアクセスが許可されていません。\n\niPhoneの「設定」>「プライバシーとセキュリティ」>「カメラ」から、お使いのブラウザ（Safari/Chrome）のカメラアクセスを許可してください。\n\nPCの場合：OSのプライバシー設定や、他のアプリがカメラを使用していないか確認してください。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    } else if (error.message && error.message.includes("jsQR library not loaded")) {
      if (typeof setScanError === 'function') setScanError("QRコード読み取りライブラリの読み込みに失敗しました。");
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: 'ライブラリエラー',
          message: 'QRコードの読み取りに必要なコンポーネントが読み込めませんでした。\n\nWebページの再読み込み、または開発者にご連絡ください。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    } else if (error.name === 'NotReadableError' || error.name === 'OverconstrainedError' || error.name === 'AbortError' || error.name === 'NotFoundError' || error.name === 'TypeError') {
      if (typeof setScanError === 'function') setScanError("カメラの初期化中に問題が発生しました。");
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: 'カメラエラー',
          message: `カメラの初期化中に問題が発生しました。\n\n他のアプリがカメラを使用している可能性があります。またはPC/デバイスに背面カメラが搭載されていない、プライバシー設定で無効になっている等の原因が考えられます。\n\nエラー詳細: ${error.message || error.name || error.toString()}`,
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    }
    else {
      if (typeof setScanError === 'function') setScanError("QRコードの読み取り中に予期せぬエラーが発生しました。");
      if (typeof setModal === 'function') {
        setModal({
          isOpen: true,
          title: 'スキャンエラー',
          message: `QRコードの読み取り中にエラーが発生しました。\n\nエラー詳細: ${error.message || error.name || error.toString()}`,
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    }
  }, [setScanError, setScanMode, setModal]);

  return (
    <div className="p-4 text-white text-center flex flex-col items-center font-inter animate-fade-in">
      <h2 className="text-3xl font-bold mb-6">QRコード読み取り</h2>

      {scanMode === 'initial' && (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-700 rounded-xl mb-6 shadow-lg animate-slide-in-right">
          <p className="text-gray-300 text-lg mb-6">店舗のQRコードをスキャンしてください</p>
          <button
            onClick={handleScanStart}
            className="bg-green-500 text-white px-8 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-green-600 transition-all duration-300 transform active:scale-95"
          >
            カメラを起動してスキャン
          </button>
          {scanError && (
            <p className="text-red-400 mt-4 text-sm animate-pulse">{scanError}</p>
          )}
        </div>
      )}

      {scanMode === 'scanning' && (
        <div className="mt-4 bg-gray-700 p-6 rounded-xl shadow-lg flex flex-col items-center animate-fade-in">
          <p className="mb-4 text-xl text-yellow-300 font-semibold">カメラ起動中...</p>
          <div className="w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden">
            <QrCodeScanner
              ref={qrScannerRef}
              onResult={onResult}
              onError={onError}
              constraints={{ video: { facingMode: 'environment' } }}
              scanDelay={500}
              videoContainerStyle={{ padding: '0px' }}
              videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
              isActive={scanMode === 'scanning'}
            />
          </div>
          <p className="text-gray-300 mt-4 text-sm">QRコードをカメラにかざしてください</p>
          {scanError && (
            <p className="text-red-400 mt-4 text-sm animate-pulse">{scanError}</p>
          )}
          <button
            onClick={handleCaptureImage} 
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full text-lg font-semibold shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95"
          >
            現在のカメラ映像を保存
          </button>
          <button
            onClick={() => {
              if (typeof setScanMode === 'function') setScanMode('initial');
              if (typeof setScanError === 'function') setScanError('');
            }}
            className="mt-6 bg-gray-600 text-white px-6 py-2 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform active:scale-95"
          >
            スキャンを中止
          </button>
        </div>
      )}

      {scanMode === 'input_amount' && (
        <div className="mt-4 bg-gray-700 p-6 rounded-xl shadow-lg animate-slide-in-left">
          <p className="mb-4 text-xl text-yellow-300 font-semibold">金額を入力してください</p>
          <p className="mb-6 text-lg text-gray-300">スキャンしたQRコードに金額情報がありませんでした。</p>
          <input
            type="number"
            value={scanInputAmount}
            onChange={(e) => {
              if (typeof setScanInputAmount === 'function') setScanInputAmount(e.target.value);
              if (typeof setScanError === 'function') setScanError('');
            }}
            placeholder="¥"
            className="w-full p-3 rounded-lg text-black text-2xl font-bold text-center mb-4 bg-gray-100"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <button
            onClick={() => {
              const amount = parseInt(scanInputAmount, 10);

              if (isNaN(amount) || amount <= 0) {
                if (typeof setScanError === 'function') setScanError("有効な金額（1円以上の数字）を入力してください。");
                return;
              }
              if (amount > balance) {
                if (typeof setScanError === 'function') setScanError(`残高が不足しています。現在の残高は¥${balance.toLocaleString()}です。`);
                return;
              }
              if (typeof setScannedAmount === 'function') setScannedAmount(amount);
              if (typeof setScannedStoreId === 'function') setScannedStoreId(null); // 受取人IDではなく、従来の店舗IDとしてnullをセット
              if (typeof setScreen === 'function') setScreen('payment_confirmation');
              if (typeof setScanMode === 'function') setScanMode('initial');
              if (typeof setScanError === 'function') setScanError('');
            }}
            className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg font-bold w-full shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95"
          >
            金額を確定する
          </button>
          {scanError && (
            <p className="text-red-400 mt-4 text-sm animate-pulse">{scanError}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanScreen;
