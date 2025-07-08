import React from 'react';

// PaymentCompleteScreenコンポーネントが受け取るプロップにlastTransactionDetailsとcurrentBalanceを追加
const PaymentCompleteScreen = ({ setScreen, lastTransactionDetails, currentBalance }) => {
  // lastTransactionDetailsからトランザクションの種類と金額を取得
  const { type, amount } = lastTransactionDetails;
  const isCharge = type === 'charge'; // チャージか支払いかを判定

  return (
    // relativeとoverflow-hiddenを追加して、中のアニメーションが親要素からはみ出さないようにする
    // bg-gray-900を追加して、親のApp.jsの背景色に合わせる
    <div className="p-4 text-white text-center flex flex-col items-center justify-center min-h-[calc(100vh-120px)] font-inter relative overflow-hidden bg-gray-900">
      {/* 🎉と✨の絵文字をアニメーションさせるためのコンテナ */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        {/* 各絵文字にアニメーションと遅延を設定 */}
        {/* top, leftは中央を基準に調整。transform: translate(-50%, -50%) で絵文字の中心を正確に配置 */}
        {/* --end-x, --end-y はCSS変数として定義し、keyframes内で使用 */}
        <span className="absolute text-5xl animate-confetti-burst" style={{top: 'calc(50% - 20px)', left: 'calc(50% - 20px)', animationDelay: '0s', '--end-x': '-200px', '--end-y': '-300px', '--end-rotate': '-720deg'}}>🎉</span>
        <span className="absolute text-4xl animate-confetti-burst" style={{top: 'calc(50% + 10px)', left: 'calc(50% + 5px)', animationDelay: '0.2s', '--end-x': '0px', '--end-y': '-400px', '--end-rotate': '360deg'}}>✨</span>
        <span className="absolute text-5xl animate-confetti-burst" style={{top: 'calc(50% - 10px)', left: 'calc(50% + 30px)', animationDelay: '0.4s', '--end-x': '200px', '--end-y': '-300px', '--end-rotate': '720deg'}}>🎊</span>
        <span className="absolute text-4xl animate-confetti-burst" style={{top: 'calc(50% + 20px)', left: 'calc(50% - 40px)', animationDelay: '0.6s', '--end-x': '-150px', '--end-y': '-200px', '--end-rotate': '360deg'}}>🎉</span>
        <span className="absolute text-5xl animate-confetti-burst" style={{top: 'calc(50% - 5px)', left: 'calc(50% + 10px)', animationDelay: '0.8s', '--end-x': '150px', '--end-y': '-200px', '--end-rotate': '-360deg'}}>✨</span>
        <span className="absolute text-6xl animate-confetti-burst" style={{top: 'calc(50% + 15px)', left: 'calc(50% - 25px)', animationDelay: '1.0s', '--end-x': '-50px', '--end-y': '-100px', '--end-rotate': '180deg'}}>🥳</span>
        <span className="absolute text-5xl animate-confetti-burst" style={{top: 'calc(50% - 30px)', left: 'calc(50% + 40px)', animationDelay: '1.2s', '--end-x': '50px', '--end-y': '-100px', '--end-rotate': '-180deg'}}>🌟</span>
        <span className="absolute text-4xl animate-confetti-burst" style={{top: 'calc(50% + 5px)', left: 'calc(50% - 10px)', animationDelay: '1.4s', '--end-x': '-100px', '--end-y': '-250px', '--end-rotate': '400deg'}}>🎈</span> {/* 風船を追加 */}
        <span className="absolute text-5xl animate-confetti-burst" style={{top: 'calc(50% - 15px)', left: 'calc(50% + 20px)', animationDelay: '1.6s', '--end-x': '100px', '--end-y': '-250px', '--end-rotate': '-400deg'}}>🎉</span>
      </div>

      {/* アニメーション用のCSSスタイルを直接埋め込む */}
      {/* クラッカーが舞うようなアニメーション */}
      <style>
        {`
        @keyframes confetti-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5) rotate(0deg); /* 画面中央で小さく開始 */
          }
          10% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg); /* 瞬間的に出現し、少し膨らむ */
          }
          50% {
            opacity: 1;
            /* 個別の飛び散る方向と回転を設定 (--end-x, --end-y, --end-rotateはstyle属性で渡される) */
            transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(1) rotate(var(--end-rotate)); 
          }
          100% {
            opacity: 0;
            /* 少し落ちながらフェードアウト */
            transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y) + 50px)) scale(0.8) rotate(var(--end-rotate)); 
          }
        }
        .animate-confetti-burst {
          animation: confetti-burst 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; /* 動きの速さ */
          animation-fill-mode: forwards; /* アニメーション終了後も最終状態を維持 */
        }
        `}
      </style>

      {/* メインコンテンツ - z-indexを上げてアニメーションの上に表示 */}
      <div className="bg-green-500 rounded-full p-6 mb-6 z-10">
        <span className="text-white text-6xl animate-pop-success">✅</span>
      </div>
      <h2 className="text-3xl font-bold mb-4 animate-fade-in-up z-10">完了！</h2>
      {/* チャージか支払いかでメッセージを出し分ける */}
      <p className="text-lg text-gray-300 mb-2 animate-fade-in-up delay-100 z-10">
        {isCharge ? `¥${amount.toLocaleString()}をチャージしました。` : `¥${amount.toLocaleString()}のお支払いが完了しました。`}
      </p>
      {/* 現在の残高を表示 */}
      <p className="text-xl font-bold text-white mb-8 animate-fade-in-up delay-200 z-10">
        現在の残高: ¥{currentBalance.toLocaleString()}
      </p>
      <button
        onClick={() => setScreen('home')}
        className="bg-gray-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 z-10"
      >
        ホームに戻る
      </button>
    </div>
  );
};

export default PaymentCompleteScreen;
