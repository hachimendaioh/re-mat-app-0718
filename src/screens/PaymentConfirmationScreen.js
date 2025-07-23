import React from 'react';
import CustomModal from '../components/common/CustomModal'; // CustomModalのパスを確認

/**
 * 支払い確認画面コンポーネント。
 * QRコードスキャン後に支払い内容を表示し、ユーザーに確認を促します。
 *
 * @param {object} props - コンポーネントのプロパティ
 * @param {number} props.amount - 支払い金額
 * @param {number} props.balance - 現在のユーザー残高
 * @param {object} props.storeId - スキャンされた店舗情報（IDと名前、orderId、itemsを含むオブジェクト）
 * @param {function} props.onConfirmPayment - 支払い確定時に呼び出されるコールバック関数
 * @param {function} props.onCancelPayment - 支払いキャンセル時に呼び出されるコールバック関数
 * @param {boolean} props.isLoading - 支払い処理中かどうかを示すフラグ
 * @param {function} props.setModal - App.jsから渡されるモーダル制御関数
 */
export default function PaymentConfirmationScreen({
  amount,
  balance,
  storeId,
  onConfirmPayment = () => { console.warn('onConfirmPayment is not provided'); },
  onCancelPayment,
  isLoading,
  setModal
}) {
  // storeIdから店舗名、ID、そして商品リストとorderIdを抽出
  const receiverId = storeId?.id || '不明';
  const storeName = storeId?.name || '不明な店舗';
  const items = storeId?.items || null; // 商品リストを抽出
  const orderId = storeId?.orderId || null; // ★追加: orderIdを抽出★

  // 支払い確定ボタンがクリックされた時のハンドラ
  const handleConfirmClick = () => {
    console.log("PaymentConfirmationScreen: 支払い確定ボタンがクリックされました。");
    console.log("PaymentConfirmationScreen: onConfirmPayment を呼び出します。");
    // 親コンポーネント (App.js) から渡された onConfirmPayment 関数を呼び出す
    // ここで storeName を渡すことで、App.jsのconfirmPayment関数が履歴に店舗名を記録できるようになります。
    onConfirmPayment(storeName);
  };

  // 支払いキャンセルボタンがクリックされた時のハンドラ
  const handleCancelClick = () => {
    console.log("PaymentConfirmationScreen: 支払いキャンセルボタンがクリックされました。");
    // 親コンポーネント (App.js) から渡された onCancelPayment 関数を呼び出す
    onCancelPayment();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-inter">
      <h2 className="text-3xl font-bold mb-6 text-green-400">支払い確認</h2>

      {/* 支払い詳細の表示 */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm mb-8 animate-fade-in-up">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">店舗: {storeName}</p>
          {orderId && <p className="text-sm text-gray-500 mt-2">注文ID: {orderId}</p>} {/* orderIdを表示 */}
          <p className="text-sm text-gray-500 mt-2">受取人ID: {receiverId}</p>
        </div>

        <hr className="border-gray-700 my-4" />

        {items && items.length > 0 ? (
          <div>
            <h4 className="text-lg font-bold mb-2 text-gray-300">注文内容</h4>
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li key={index} className="flex justify-between text-base">
                  <span className="text-gray-200">{item.name} <span className="text-gray-400">({item.quantity})</span></span>
                  <span className="font-semibold text-white">¥{item.price.toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <hr className="border-gray-700 my-4" />
          </div>
        ) : (
          <p className="text-xl text-gray-300 mb-2 text-center">支払い金額</p>
        )}

        <p className="text-4xl font-extrabold text-white text-center">¥{amount ? amount.toLocaleString() : '0'}</p>
        <p className="text-lg text-gray-300 mt-4 text-center">現在の残高: ¥{balance ? balance.toLocaleString() : '0'}</p>
      </div>

      {/* 確認ボタンとキャンセルボタン */}
      <div className="flex space-x-4">
        <button
          onClick={handleConfirmClick}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform active:scale-95"
          disabled={isLoading} // 支払い処理中は無効化
        >
          支払い確定
        </button>
        <button
          onClick={handleCancelClick}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform active:scale-95"
          disabled={isLoading} // 支払い処理中は無効化
        >
          キャンセル
        </button>
      </div>

      {/* ローディング表示 (isLoadingがtrueの場合に表示) */}
      {isLoading && (
        <div className="mt-8">
          <p className="text-lg text-gray-400">処理中...</p>
        </div>
      )}
    </div>
  );
}
