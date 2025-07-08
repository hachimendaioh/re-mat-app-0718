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
    setScannedAmount(null);
    setScanInputAmount('');
    setScanError('');
    setScannedStoreId(null); // 受取機能のために初期化
    
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
            setModal({
              isOpen: true,
              title: 'エラー',
              message: 'ポップアップウィンドウを開けませんでした。ブラウザの設定を確認してください。',
              onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
              showCancelButton: false,
            });
          }
        } catch (e) {
          console.error("Failed to capture image from canvas:", e);
          setModal({
            isOpen: true,
            title: 'キャプチャエラー',
            message: `カメラ映像のキャプチャに失敗しました。\n詳細: ${e.message || e.toString()}`,
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
        }
      } else {
        console.warn("Canvas element not available for capture.");
        setModal({
          isOpen: true,
          title: 'キャプチャエラー',
          message: 'カメラ映像が準備できていません。',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    } else {
      console.warn("qrScannerRef.current or getCanvas is not available.");
      setModal({
        isOpen: true,
        title: 'キャプチャエラー',
        message: 'カメラコンポーネントが準備できていません。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    }
  }, [setModal]);


  const onResult = useCallback((result, error) => {
    console.log("ScanScreen: onResult - 関数がトリガーされました。");
    console.log("ScanScreen: onResult - rawResult object:", result);
    console.log("ScanScreen: onResult - error object (from QrCodeScanner):", error);

    // ★QRコードが検出された場合のログを強化
    if (result && result.text) {
      console.log("ScanScreen: onResult - QRコードのテキストが検出されました:", result.text);
      console.log("ScanScreen: onResult - QRコードのrawResult全体:", JSON.stringify(result, null, 2)); // resultオブジェクト全体を整形してログ出力

      let rawScannedData = result.text;
      let parsedAmount = NaN;
      let parsedStoreId = null; 
      let parsedReceiverId = null; 
      let parsedReceiverName = null; 
      let displayData = rawScannedData;

      console.log("ScanScreen: onResult - rawScannedData (result.text):", rawScannedData);

      try {
        // Base64デコードのロジック
        const decodedData = new TextDecoder().decode(Uint8Array.from(atob(rawScannedData), c => c.charCodeAt(0)));
        console.log("ScanScreen: onResult - Base64 decoded data:", decodedData);

        const jsonData = JSON.parse(decodedData);
        console.log("ScanScreen: onResult - JSON parsed successfully:", jsonData);

        // 新しいQRコード形式: {"receiverId": "...", "amount": ...}
        if (jsonData && jsonData.receiverId) {
          console.log("ScanScreen: onResult - 新しい受取人QRフォーマットを検出しました。");
          parsedReceiverId = jsonData.receiverId;
          parsedReceiverName = jsonData.receiverName || '不明な受取人';
          if (typeof jsonData.amount === 'number' && jsonData.amount > 0) {
            parsedAmount = jsonData.amount;
          }
          displayData = `受取人: ${parsedReceiverName} (ID: ${parsedReceiverId}), 金額: ${parsedAmount > 0 ? parsedAmount.toLocaleString() + '円' : '未指定'}`;
          
          if (parsedReceiverId) {
            console.log("ScanScreen: onResult - 受取人情報が見つかりました。支払い確認画面へ遷移します。");
            setScannedAmount(parsedAmount > 0 ? parsedAmount : null);
            setScanInputAmount(parsedAmount > 0 ? String(parsedAmount) : '');
            setScannedStoreId({ id: parsedReceiverId, name: parsedReceiverName }); // 受取人情報をセット
            setScanMode('initial'); // QRコードを読み取ったらすぐにスキャンモードを終了
            setScanError('');
            setScreen('payment_confirmation');
            return; // 成功した場合はここで処理を終了
          }
        } 
        // 従来のQRコード形式 (金額のみ、または店舗ID+金額) - Base64デコードに成功した場合のフォールバック
        else if (jsonData && typeof jsonData.amount === 'number' && jsonData.amount > 0) {
          console.log("ScanScreen: onResult - 従来の金額QRフォーマットを検出しました。(Base64デコード後)");
          parsedAmount = jsonData.amount;
          parsedStoreId = jsonData.storeId || null;
          displayData = JSON.stringify(jsonData);
        } else {
          console.warn("ScanScreen: onResult - 期待されるJSONフォーマットではありません。古い解析方法を試みます。(Base64デコード後)");
          const cleanedData = decodedData.replace(/[^0-9]/g, '').trim(); // デコードされたデータを使用
          parsedAmount = parseInt(cleanedData, 10);
          displayData = decodedData;
        }
      } catch (decodeOrJsonError) {
        console.error("ScanScreen: onResult - Base64デコードまたはJSON解析に失敗しました。元のrawScannedDataで直接解析を試みます:", decodeOrJsonError);
        // Base64デコードに失敗した場合、元のrawScannedDataで直接JSON解析を試みる（従来のQRコード対応）
        try {
          const originalJsonData = JSON.parse(rawScannedData);
          if (originalJsonData && typeof originalJsonData.amount === 'number' && originalJsonData.amount > 0) {
            console.log("ScanScreen: onResult - 従来の金額QRフォーマットを検出しました。(Base64デコード前)");
            parsedAmount = originalJsonData.amount;
            parsedStoreId = originalJsonData.storeId || null;
            displayData = rawScannedData;
          } else {
             console.warn("ScanScreen: onResult - 従来のJSONフォーマットでもありません。数値解析を試みます。");
             const cleanedData = rawScannedData.replace(/[^0-9]/g, '').trim();
             parsedAmount = parseInt(cleanedData, 10);
             displayData = rawScannedData;
          }
        } catch (originalJsonError) {
          console.error("ScanScreen: onResult - 従来のJSON解析も失敗しました。数値解析を試みます:", originalJsonError);
          const cleanedData = rawScannedData.replace(/[^0-9]/g, '').trim();
          parsedAmount = parseInt(cleanedData, 10);
          displayData = rawScannedData;
        }
      }

      console.log("ScanScreen: onResult - 最終的な解析結果: parsedAmount:", parsedAmount, "isNaN:", isNaN(parsedAmount), "parsedReceiverId:", parsedReceiverId);

      // このブロックは、解析が失敗した場合にのみヒットするはず
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        console.log("ScanScreen: onResult - 金額が有効です。支払い確認画面へ遷移します。");
        setScannedAmount(parsedAmount);
        setScanInputAmount(String(parsedAmount));
        setScannedStoreId(parsedStoreId); // 従来の店舗ID（nullの可能性あり）
        
        setScanMode('initial'); // QRコードを読み取ったらすぐにスキャンモードを終了
        setScanError('');
        setScreen('payment_confirmation');
      } else {
        console.log("ScanScreen: onResult - QRデータエラーモーダルを表示します。");
        setScanError("無効なQRコードデータです。有効な金額または受取人情報が含まれていません。");
        setScanMode('initial'); // スキャンモードを終了
        setModal({
          isOpen: true,
          title: 'QRデータエラー',
          message: `スキャンしたQRコードに有効な金額または受取人情報が含まれていませんでした。\n\n検出されたデータ: "${displayData}"\n解析結果: ${isNaN(parsedAmount) ? '数値に変換できませんでした' : parsedAmount}`,
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
          showCancelButton: false,
        });
      }
    } else { 
      console.warn("ScanScreen: onResult - result.textが空または未定義です。QRコードが検出されなかったか、デコードに失敗しました。");
      setScanError("QRコードが検出されませんでした。またはデコードに失敗しました。");
      setModal({
        isOpen: true,
        title: 'スキャン失敗',
        message: 'QRコードが検出されなかったか、読み取りに失敗しました。カメラのピントや照明を確認してください。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      setScanMode('initial'); // スキャンモードを終了
    }

    if (error) {
      console.error("ScanScreen: QRコードスキャン結果処理エラー (onResult error object):", error);
    }
  }, [setScannedAmount, setScanInputAmount, setScanMode, setScreen, setScanError, setModal, setScannedStoreId, balance]);

  const onError = useCallback((error) => {
    console.error("ScanScreen received error (onError callback):", error);
    // エラーが発生したら、すぐにスキャンモードを終了し、カメラを停止する
    setScanMode('initial'); 

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      setScanError("カメラへのアクセスが拒否されました。設定を確認してください。");
      setModal({
        isOpen: true,
        title: 'カメラアクセス拒否',
        message: 'カメラへのアクセスが許可されていません。\n\niPhoneの「設定」>「プライバシーとセキュリティ」>「カメラ」から、お使いのブラウザ（Safari/Chrome）のカメラアクセスを許可してください。\n\nPCの場合：OSのプライバシー設定や、他のアプリがカメラを使用していないか確認してください。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } else if (error.message && error.message.includes("jsQR library not loaded")) {
      setScanError("QRコード読み取りライブラリの読み込みに失敗しました。");
      setModal({
        isOpen: true,
        title: 'ライブラリエラー',
        message: 'QRコードの読み取りに必要なコンポーネントが読み込めませんでした。\n\nWebページの再読み込み、または開発者にご連絡ください。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } else if (error.name === 'NotReadableError' || error.name === 'OverconstrainedError' || error.name === 'AbortError' || error.name === 'NotFoundError' || error.name === 'TypeError') {
      setScanError("カメラの初期化中に問題が発生しました。");
      setModal({
        isOpen: true,
        title: 'カメラエラー',
        message: `カメラの初期化中に問題が発生しました。\n\n他のアプリがカメラを使用している可能性があります。またはPC/デバイスに背面カメラが搭載されていない、プライバシー設定で無効になっている等の原因が考えられます。\n\nエラー詳細: ${error.message || error.name || error.toString()}`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    }
    else {
      setScanError("QRコードの読み取り中に予期せぬエラーが発生しました。");
      setModal({
        isOpen: true,
        title: 'スキャンエラー',
        message: `QRコードの読み取り中にエラーが発生しました。\n\nエラー詳細: ${error.message || error.name || error.toString()}`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
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
              // ★ここを背面カメラを強制する設定に戻します★
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
              setScanMode('initial');
              setScanError('');
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
              setScanInputAmount(e.target.value);
              setScanError('');
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
                setScanError("有効な金額（1円以上の数字）を入力してください。");
                return;
              }
              if (amount > balance) {
                setScanError(`残高が不足しています。現在の残高は¥${balance.toLocaleString()}です。`);
                return;
              }
              setScannedAmount(amount);
              setScannedStoreId(null); // 受取人IDではなく、従来の店舗IDとしてnullをセット
              setScreen('payment_confirmation');
              setScanMode('initial');
              setScanError('');
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
