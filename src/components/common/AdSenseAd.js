// src/components/common/AdSenseAd.js
import React, { useEffect, useRef, useState } from 'react';

const AdSenseAd = ({ slot, style, format, layout, layoutKey, onAdLoad }) => {
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false); // 広告がロードされたかどうかの状態

  // slot が必須であることを確認
  if (!slot) {
    console.error("AdSenseAd: 'slot' prop is required for AdSenseAd component.");
    return null; // slot がない場合は何もレンダリングしない
  }

  useEffect(() => {
    // Google AdSense スクリプトがロードされていることを確認
    // window.adsbygoogle が定義されていることを確認
    if (window && window.adsbygoogle && adRef.current) {
      try {
        // 広告ユニットの初期化を、コンポーネントマウント時に一度だけ実行
        // push() メソッドは、広告ユニットの準備ができたことを AdSense スクリプトに通知します。
        // ここでのpushは、DOMにins要素が存在することをAdSenseに知らせるためのもの
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        console.log(`AdSenseAd: adsbygoogle.push() called for slot: ${slot}`);
        
        // 広告の読み込みを監視（簡易的な方法。より確実な方法はAdSenseのイベントリスナーを使う）
        // MutationObserver を使用して、広告が DOM に追加されたことを検出します。
        const observer = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // iframe が追加されたら広告がロードされたと判断
              const iframe = adRef.current.querySelector('iframe');
              if (iframe) {
                setAdLoaded(true); // iframeがあれば広告がロードされたと判断
                if (onAdLoad) {
                  onAdLoad(); // 親コンポーネントに広告がロードされたことを通知
                }
                observer.disconnect(); // 監視を停止
                console.log(`AdSenseAd: Ad loaded for slot: ${slot}`);
              }
            }
          }
        });

        // adRef.current 要素の子要素の変更を監視
        observer.observe(adRef.current, { childList: true, subtree: true });

        // クリーンアップ関数
        return () => {
          observer.disconnect(); // コンポーネントがアンマウントされたら監視を停止
          // 広告ユニットのDOM要素自体をクリーンアップする必要がある場合もあるが、
          // ReactがDOMを管理するため通常は不要。
          console.log(`AdSenseAd: Observer disconnected for slot: ${slot}`);
        };

      } catch (e) {
        console.error("AdSense initialization error:", e);
      }
    } else {
      console.warn(`AdSenseAd: window.adsbygoogle not ready or adRef.current is null for slot: ${slot}`);
    }
  }, []); // ★依存配列を空にすることで、コンポーネントマウント時に一度だけ実行されるようにする

  return (
    <div
      ref={adRef}
      className={`adsbygoogle ${adLoaded ? '' : 'hidden'}`} // ロードされるまで非表示にする
      style={adLoaded ? style : {}} // ロードされるまでスタイルを適用しない
      data-ad-client="ca-pub-2446505733093667" // ★あなたのAdSenseクライアントIDに置き換えてください★
      data-ad-slot={slot} // ★slot propを必須とし、各広告ユニットでユニークな値を渡す
      data-ad-format={format}
      data-full-width-responsive="true"
      data-ad-layout={layout}
      data-ad-layout-key={layoutKey}
    >
      {/* 広告がロードされるまで表示されるプレースホルダー */}
      {!adLoaded && (
        <div style={{ ...style, backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>
          広告を読み込み中...
        </div>
      )}
    </div>
  );
};

export default AdSenseAd;
