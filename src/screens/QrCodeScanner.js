// src/screens/QrCodeScanner.js

import React, { useEffect, useRef, forwardRef, useCallback, useImperativeHandle } from 'react';
import jsQR from 'jsqr'; // jsQRライブラリをインポート

// QrCodeScanner コンポーネント
// isActive: カメラを有効/無効にするためのプロパティ
// onResult: QRコードが検出されたときに呼び出されるコールバック (検出されたQRコードのテキストデータが渡される)
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
      if (!videoRef.current.paused) { // paused プロパティで確認
        videoRef.current.pause();
        console.log("QrCodeScanner: stopCamera - ビデオを一時停止しました。");
      }
    }
    console.log("QrCodeScanner: stopCamera - カメラ停止処理が完了しました。");
  }, []);

  // QRコードをスキャンするメインループ
  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !videoRef.current.videoWidth || videoRef.current.paused) {
      // ビデオが準備できていない、または一時停止している場合は次のフレームを待つ
      animationFrameId.current = requestAnimationFrame(scanQRCode);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    // ★修正: willReadFrequently を true に設定
    const context = canvas.getContext('2d', { willReadFrequently: true }); 

    // キャンバスのサイズをビデオのサイズに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // スキャン頻度を制御
    const currentTime = Date.now();
    if (currentTime - lastScanTime.current > scanDelay) {
      lastScanTime.current = currentTime;

      // jsQRでQRコードを検出
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert", // 反転したQRコードを無視する設定
      });

      if (code) {
        console.log("QrCodeScanner: scanQRCode - QRコードを検出しました:", code.data);
        // ★ここを修正: onResult コールバックに検出されたテキストデータをオブジェクトとして渡す★
        onResult({ text: code.data }); 
        // QRコード検出後、スキャンループは停止せず、親コンポーネントがisActiveをfalseにするのを待つ
        // stopCamera(); // ここでは停止しない
        return; // QRコード検出後は次のフレームでのスキャンをスキップ
      } else {
        // console.log("QrCodeScanner: scanQRCode - QRコードは検出されませんでした。");
        // QRコードが検出されない場合でも、スキャンを続行
      }
    }
    
    // 次のフレームで再度スキャン
    animationFrameId.current = requestAnimationFrame(scanQRCode);
  }, [onResult, scanDelay]); // onResult を依存配列に追加

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
