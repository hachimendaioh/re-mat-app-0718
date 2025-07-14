// src/components/common/AdSenseAd.js
import React, { useEffect, useRef, useState } from 'react';

const AdSenseAd = ({ slot, style, format, layout, layoutKey, onAdLoad }) => {
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false); // 広告がロードされたかどうかの状態

  useEffect(() => {
    // コンポーネントがマウントされ、adRef.currentが利用可能になったら処理を開始
    if (adRef.current) {
      // Google AdSense スクリプトがロードされていることを確認
      // window.adsbygoogle が定義されていることを確認
      // かつ、この広告スロットがまだAdSenseによって処理されていないことを確認
      // data-ad-status="done" や data-ad-status="filled" があれば既に処理済み
      const currentAdElement = adRef.current.querySelector('.adsbygoogle');

      // 広告要素自体が存在し、かつまだAdSenseによって処理されていない場合のみpushする
      // data-ad-status が 'done' または 'filled' でないことを確認
      if (window && window.adsbygoogle && currentAdElement && 
          currentAdElement.getAttribute('data-ad-status') !== 'done' &&
          currentAdElement.getAttribute('data-ad-status') !== 'filled') {
        try {
          console.log("AdSenseAd: Pushing ad unit to adsbygoogle:", slot);
          // 広告ユニットの初期化
          (window.adsbygoogle = window.adsbygoogle || []).push({});

          // MutationObserver を使用して、広告が DOM に追加されたことを検出します。
          // 特にiframeが追加されたら広告がロードされたと判断します。
          const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const iframe = adRef.current.querySelector('iframe');
                if (iframe) {
                  console.log(`AdSenseAd: Ad for slot ${slot} loaded (iframe detected).`);
                  setAdLoaded(true); // iframeがあれば広告がロードされたと判断
                  if (onAdLoad) {
                    onAdLoad(); // 親コンポーネントに広告がロードされたことを通知
                  }
                  observer.disconnect(); // 監視を停止
                  return; // 複数のiframeが追加されても一度だけ処理
                }
              }
            }
          });

          // adRef.current 要素の子要素の変更を監視
          observer.observe(adRef.current, { childList: true, subtree: true });

          // クリーンアップ関数
          return () => {
            console.log(`AdSenseAd: Cleaning up observer for slot ${slot}.`);
            observer.disconnect(); // コンポーネントがアンマウントされたら監視を停止
          };

        } catch (e) {
          console.error("AdSense initialization error:", e);
        }
      } else {
        // 既にロード済み、またはadsbygoogleが利用不可の場合のログ
        if (currentAdElement && (currentAdElement.getAttribute('data-ad-status') === 'done' || currentAdElement.getAttribute('data-ad-status') === 'filled')) {
          console.log(`AdSenseAd: Ad for slot ${slot} already loaded, skipping push.`);
          if (!adLoaded) { // 既にロード済みだが、内部状態が未更新の場合
            setAdLoaded(true);
            if (onAdLoad) {
              onAdLoad();
            }
          }
        } else if (!window.adsbygoogle) {
          console.warn("AdSenseAd: window.adsbygoogle is not defined. AdSense script might not be loaded yet.");
        }
      }
    }
  }, [slot, onAdLoad, adLoaded]); // adLoadedを依存配列に追加して、状態変更時に再評価させる

  return (
    <div
      ref={adRef}
      className={`adsbygoogle ${adLoaded ? '' : 'hidden'}`} // ロードされるまで非表示にする
      style={adLoaded ? style : {}} // ロードされるまでスタイルを適用しない
      data-ad-client="ca-pub-2446505733093667" // ★あなたのAdSenseクライアントIDに置き換えてください★
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
      data-ad-layout={layout}
      data-ad-layout-key={layoutKey}
    >
      {/* 広告がロードされるまで表示されるプレースホルダー */}
      {!adLoaded && (
        <div style={{ ...style, backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px', minHeight: style.height || '100px' }}>
          広告を読み込み中...
        </div>
      )}
    </div>
  );
};

export default AdSenseAd;
