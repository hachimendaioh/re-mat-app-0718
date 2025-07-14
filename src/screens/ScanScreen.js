import React, { useState, useCallback, useEffect, useRef } from 'react';
import QrCodeScanner from './QrCodeScanner'; // QrCodeScanner.jsがsrc/screensフォルダにあるため、パスは './QrCodeScanner' で正しいです。

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
  setScannedStoreId // スキャンで店舗IDも設定できるように
}) => {

  // QrCodeScannerコンポーネントのrefを保持するためのref
  const qrScannerRef = useRef(null); 

  useEffect(() => {
    // 各セッターが関数であることを確認してから呼び出す
    if (typeof setScannedAmount === 'function') setScannedAmount(null);
    if (typeof setScanInputAmount === 'function') setScanInputAmount('');
    if (typeof setScanError === 'function') setScanError('');
    if (typeof setScannedStoreId === 'function') setScannedStoreId(null); // 受取機能のために初期化

    // コンポーネントがアンマウントされるか、scanModeが変更されたときにカメラを停止するクリーンアップ
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.stopCamera) {
        qrScannerRef.current.stopCamera();
      }
    };
  }, [setScannedAmount, setScanInputAmount, setScanError, setScannedStoreId, scanMode]); // scanModeを依存配列に追加

  // カメラ映像をキャプチャして新しいタブで開く関数
  const handleCaptureImage = useCallback(() => {
    if (qrScannerRef.current && qrScannerRef.current.getCanvas) {
      const canvas = qrScannerRef.current.getCanvas();
      if (canvas) {
        try {
          const imageDataUrl = canvas.toDataURL('image/png'); // キャンバスの内容を画像データURLとして取得
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


  const onResult = useCallback((result, error) => {
    // ★追加ログ1: onResultが呼ばれたことと、受け取ったresultの内容を確認★
    console.log("ScanScreen Debug: onResult called. result:", result, "error:", error);

    if (result && result.text) { 
      let rawScannedData = result.text;
      let parsedAmount = NaN;
      let parsedStoreId = null; 
      let parsedReceiverId = null; 
      let parsedReceiverName = null; 
      let displayData = rawScannedData;

      // ★追加ログ2: デコード前の生データを確認★
      console.log("ScanScreen Debug: Raw scanned data:", rawScannedData);

      try {
        const decodedData = new TextDecoder().decode(Uint8Array.from(atob(rawScannedData), c => c.charCodeAt(0)));
        // ★追加ログ3: Base64デコード後のデータを確認★
        console.log("ScanScreen Debug: Decoded data (after atob):", decodedData);

        const jsonData = JSON.parse(decodedData);
        // ★追加ログ4: JSONパース後のデータを確認★
        console.log("ScanScreen Debug: Parsed JSON data:", jsonData);

        if (jsonData && jsonData.receiverId) {
          // ★追加ログ5: receiverIdパスに入ったことを確認★
          console.log("ScanScreen Debug: Data contains receiverId.");
          parsedReceiverId = jsonData.receiverId;
          parsedReceiverName = jsonData.receiverName || '不明な受取人';
          if (typeof jsonData.amount === 'number' && jsonData.amount > 0) {
            parsedAmount = jsonData.amount;
            // ★追加ログ6: 金額が有効であることを確認★
            console.log("ScanScreen Debug: Valid amount found in receiverId path:", parsedAmount);
          } else {
            // ★追加ログ7: receiverIdはあるが、金額が無効な場合★
            console.log("ScanScreen Debug: ReceiverId found, but amount is invalid or missing:", jsonData.amount);
          }
          displayData = `受取人: ${parsedReceiverName} (ID: ${parsedReceiverId}), 金額: ${parsedAmount > 0 ? parsedAmount.toLocaleString() + '円' : '未指定'}`;
          
          if (parsedReceiverId) {
            // ★追加ログ8: receiverIdが最終的に有効と判断され、画面遷移・状態更新が試みられる直前★
            console.log("ScanScreen Debug: Initiating screen transition to payment_confirmation with:", {
              scannedAmount: parsedAmount,
              scanInputAmount: String(parsedAmount),
              scannedStoreId: { id: parsedReceiverId, name: parsedReceiverName }
            });

            if (typeof setScannedAmount === 'function') setScannedAmount(parsedAmount > 0 ? parsedAmount : null);
            if (typeof setScanInputAmount === 'function') setScanInputAmount(parsedAmount > 0 ? String(parsedAmount) : '');
            if (typeof setScannedStoreId === 'function') setScannedStoreId({ id: parsedReceiverId, name: parsedReceiverName }); // ★ここが以前修正した点★
            if (typeof setScanMode === 'function') setScanMode('initial');
            if (typeof setScanError === 'function') setScanError('');
            if (typeof setScreen === 'function') setScreen('payment_confirmation');
            // ★追加ログ9: 成功パス終了★
            console.log("ScanScreen Debug: Successful QR code processing (receiverId path).");
            return;
          } else {
             // ★追加ログ10: receiverIdパスに入ったが、parsedReceiverIdが無効と判断された場合（通常は発生しないはず）★
             console.log("ScanScreen Debug: parsedReceiverId was null/invalid after receiverId path logic.");
          }
        } 
        else if (jsonData && typeof jsonData.amount === 'number' && jsonData.amount > 0) {
          // ★追加ログ11: 金額のみのQRコードパスに入ったことを確認★
          console.log("ScanScreen Debug: Data contains only valid amount.");
          parsedAmount = jsonData.amount;
          parsedStoreId = jsonData.storeId || null;
          displayData = JSON.stringify(jsonData);
        } else {
          // ★追加ログ12: JSONだが、金額もreceiverIdもない場合★
          console.log("ScanScreen Debug: JSON data has no valid amount or receiverId. Attempting numeric parse from decodedData.");
          const cleanedData = decodedData.replace(/[^0-9]/g, '').trim();
          parsedAmount = parseInt(cleanedData, 10);
          displayData = decodedData;
        }
      } catch (decodeOrJsonError) {
        // ★追加ログ13: Base64デコードまたはJSONパース失敗時★
        console.log("ScanScreen Debug: Decode or JSON parse error:", decodeOrJsonError);
        try {
          const originalJsonData = JSON.parse(rawScannedData);
          if (originalJsonData && typeof originalJsonData.amount === 'number' && originalJsonData.amount > 0) {
            // ★追加ログ14: オリジナルデータが直接JSONで有効な金額の場合★
            console.log("ScanScreen Debug: Raw data is direct JSON with valid amount.");
            parsedAmount = originalJsonData.amount;
            parsedStoreId = originalJsonData.storeId || null;
            displayData = rawScannedData;
          } else {
             // ★追加ログ15: オリジナルデータもJSONではない、または金額なしの場合★
             console.log("ScanScreen Debug: Raw data is not direct JSON or has no valid amount. Attempting numeric parse from rawScannedData.");
             const cleanedData = rawScannedData.replace(/[^0-9]/g, '').trim();
             parsedAmount = parseInt(cleanedData, 10);
             displayData = rawScannedData;
          }
        } catch (originalJsonError) {
          // ★追加ログ16: オリジナルデータもJSONパース失敗時★
          console.log("ScanScreen Debug: Original JSON parse error:", originalJsonError);
          const cleanedData = rawScannedData.replace(/[^0-9]/g, '').trim();
          parsedAmount = parseInt(cleanedData, 10);
          displayData = rawScannedData;
        }
      }

      // ★追加ログ17: 最終的なparsedAmountの評価★
      console.log("ScanScreen Debug: Final parsedAmount:", parsedAmount);

      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        // ★追加ログ18: 金額が有効と判断されたが、receiverIdパスを通らなかった場合（金額のみQRなど）★
        console.log("ScanScreen Debug: Valid amount found (non-receiverId path). Initiating transition.");
        if (typeof setScannedAmount === 'function') setScannedAmount(parsedAmount);
        if (typeof setScanInputAmount === 'function') setScanInputAmount(String(parsedAmount));
        if (typeof setScannedStoreId === 'function') setScannedStoreId(parsedStoreId);
        
        if (typeof setScanMode === 'function') setScanMode('initial');
        if (typeof setScanError === 'function') setScanError('');
        if (typeof setScreen === 'function') setScreen('payment_confirmation');
      } else {
        // ★追加ログ19: 金額が無効、または解析失敗と判断された場合（「スキャン失敗」モーダルが表示されるパス）★
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
      // ★追加ログ20: resultまたはresult.textがなかった場合（「スキャン失敗」モーダルが表示されるパス）★
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
      // ★追加ログ21: onResultにエラーオブジェクトが渡された場合★
      console.error("ScanScreen Debug: QR code scan result processing error (onResult error object):", error);
    }
  }, [setScannedAmount, setScanInputAmount, setScanMode, setScreen, setScanError, setModal, setScannedStoreId, balance]);

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
    <div className="p-4 text-white text-center animate-fade-in font-inter">
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
              isActive={scanMode === 'scanning'} // isActive プロパティを追加
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
            placeholder="支払い金額を入力"
            className="text-black text-center text-2xl font-bold w-full p-3 rounded-lg mb-4 bg-gray-100 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
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
