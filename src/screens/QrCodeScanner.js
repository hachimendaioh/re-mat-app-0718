import React, { useEffect, useRef, forwardRef, useCallback, useImperativeHandle } from 'react';
import jsQR from 'jsqr'; // jsQRライブラリをインポート

// QrCodeScanner コンポーネント
// isActive: カメラを有効/無効にするためのプロパティ
// onResult: QRコードが検出されたときに呼び出されるコールバック
// onError: カメラまたはスキャン中にエラーが発生したときに呼び出されるコールバック
// constraints: MediaDevices.getUserMedia() に渡す制約オブジェクト
// scanDelay: スキャン処理の頻度 (ミリ秒)
// videoContainerStyle: ビデオ要素のコンテナに適用するスタイル
// videoStyle: ビデオ要素自体に適用するスタイル
const QrCodeScanner = forwardRef(({ isActive, onResult, onError, constraints, scanDelay = 500, videoContainerStyle, videoStyle }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const streamRef = useRef(null); // カメラのMediaStreamを保持
  const lastScanTime = useRef(0); // 最後のスキャン時刻を記録

  // 親コンポーネントから呼び出せるメソッドを公開
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    stopCamera: () => {
      stopCamera();
    },
    startCamera: () => {
      startCamera();
    }
  }));

  // カメラを停止する関数
  const stopCamera = useCallback(() => {
    console.log("QrCodeScanner: stopCamera - カメラ停止処理を開始します。");
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
      console.log("QrCodeScanner: stopCamera - アニメーションフレームをキャンセルしました。");
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`QrCodeScanner: stopCamera - トラック ${track.kind} を停止しました。`);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      // video.pause() は不要な場合が多いが、念のため
      if (!videoRef.current.paused) {
        videoRef.current.pause();
        console.log("QrCodeScanner: stopCamera - ビデオを一時停止しました。");
      }
    }
    console.log("QrCodeScanner: stopCamera - カメラ停止処理が完了しました。");
  }, []);

  // QRコードをスキャンするメインループ
  const scanQRCode = useCallback(() => {
    // console.log("QrCodeScanner: scanQRCode - スキャンループが実行されました。"); // スキャン頻度が高すぎるのでコメントアウト

    if (!videoRef.current || !canvasRef.current || !videoRef.current.videoWidth || videoRef.current.paused) {
      console.warn("QrCodeScanner: scanQRCode - ビデオが準備できていないか、一時停止しています。次のフレームを待機します。");
      animationFrameId.current = requestAnimationFrame(scanQRCode);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // キャンバスのサイズをビデオのサイズに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // スキャン頻度を制御
    const currentTime = Date.now();
    if (currentTime - lastScanTime.current > scanDelay) {
      lastScanTime.current = currentTime;
      console.log("QrCodeScanner: scanQRCode - スキャン処理を実行します。");

      // jsQRでQRコードを検出
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        // inversionAttempts: "dontInvert", // ★この行を一時的にコメントアウト
      });

      if (code) {
        console.log("QrCodeScanner: scanQRCode - QRコードを検出しました:", code.data);
        onResult(code, null); // 親コンポーネントに結果を通知
        // QRコード検出後もスキャンを続けるかどうかは親コンポーネントのロジックに依存
        // ここでは明示的に停止せず、親がisActiveをfalseにするのを待つ
      } else {
        // console.log("QrCodeScanner: scanQRCode - QRコードは検出されませんでした。"); // ログが大量に出るのでコメントアウト
      }
    }
    
    // 次のフレームで再度スキャン
    animationFrameId.current = requestAnimationFrame(scanQRCode);
  }, [onResult, scanDelay]);


  // カメラを開始する関数
  const startCamera = useCallback(async () => {
    console.log("QrCodeScanner: startCamera - カメラ起動処理を開始します。");
    if (streamRef.current) { // 既にカメラが起動している場合は何もしない
      console.log("QrCodeScanner: startCamera - カメラは既に起動しています。");
      return;
    }

    try {
      // カメラへのアクセスを要求
      console.log("QrCodeScanner: startCamera - navigator.mediaDevices.getUserMedia を呼び出します。Constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream; // ストリームをrefに保存
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // ビデオが完全にロードされてから再生を試みる
        videoRef.current.onloadedmetadata = () => {
          console.log("QrCodeScanner: startCamera - onloadedmetadata イベントが発生しました。ビデオを再生します。");
          videoRef.current.play().then(() => {
            console.log("QrCodeScanner: startCamera - ビデオ再生に成功しました。スキャンを開始します。");
            scanQRCode(); // 再生成功後にスキャンを開始
          }).catch(playError => {
            console.error("QrCodeScanner: startCamera - ビデオ再生エラー:", playError);
            onError(new Error(`ビデオ再生エラー: ${playError.message || playError.name || playError.toString()}`));
            stopCamera(); // 再生失敗時はカメラを停止
          });
        };
      }
    } catch (err) {
      console.error("QrCodeScanner: startCamera - カメラアクセスエラー:", err);
      onError(err); // 親コンポーネントにエラーを通知
      stopCamera(); // エラー発生時はカメラを停止
    }
  }, [constraints, onError, stopCamera, scanQRCode]); // scanQRCode を依存配列に追加

  useEffect(() => {
    console.log(`QrCodeScanner: useEffect - isActiveが ${isActive} に変更されました。`);
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    // クリーンアップ関数
    return () => {
      console.log("QrCodeScanner: useEffect クリーンアップ - コンポーネントがアンマウントされるか、依存関係が変更されました。");
      stopCamera(); // コンポーネントがアンマウントされる際にカメラを停止
    };
  }, [isActive, startCamera, stopCamera]);


  return (
    <div style={videoContainerStyle}>
      {/* ビデオ要素は非表示にし、キャンバスに描画する */}
      <video ref={videoRef} playsInline muted style={{ display: 'none', ...videoStyle }}></video>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }}></canvas>
    </div>
  );
});

export default QrCodeScanner;