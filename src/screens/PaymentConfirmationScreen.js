import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner'; // LoadingSpinnerをインポート

const PaymentConfirmationScreen = ({ amount, balance, storeId, onConfirmPayment, onCancelPayment, isLoading }) => {
  // storeIdがオブジェクトとして渡されることを想定
  const isReceiverPayment = storeId && typeof storeId === 'object' && storeId.id;
  const receiverId = isReceiverPayment ? storeId.id : null;
  const receiverName = isReceiverPayment ? storeId.name : null;
  const storeNameDisplay = isReceiverPayment ? receiverName : (storeId || '不明な店舗'); // 受取人名優先、なければ従来の店舗ID

  const remainingBalance = balance - amount;

  // ローディング状態を管理するための内部ステート
  const [isProcessing, setIsProcessing] = useState(isLoading);

  useEffect(() => {
    setIsProcessing(isLoading); // 親からのisLoading propを同期
  }, [isLoading]);

  const handleConfirm = async () => {
    setIsProcessing(true); // 処理開始時にローディングをtrueに
    // onConfirmPaymentはApp.jsのconfirmPaymentを呼び出す
    await onConfirmPayment(storeNameDisplay); // 店舗名または受取人名を渡す
    // onConfirmPaymentの完了後にApp.jsで画面遷移が行われるため、ここではisProcessingをfalseにする必要はない
  };

  const handleCancel = () => {
    onCancelPayment();
  };

  return (
    <div className="p-4 text-white text-center flex flex-col items-center justify-center min-h-[calc(100vh-120px)] font-inter bg-gray-900">
      <h2 className="text-3xl font-bold mb-6 animate-fade-in-up">支払い内容の確認</h2>

      <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm mb-6 animate-slide-in-right">
        <div className="mb-4">
          <p className="text-gray-300 text-lg">
            {isReceiverPayment ? '受取人:' : '店舗名:'}
          </p>
          <p className="text-white text-3xl font-bold break-all">
            {storeNameDisplay}
          </p>
          {isReceiverPayment && (
            <p className="text-gray-400 text-sm break-all">
              ID: {receiverId}
            </p>
          )}
          {!storeId && ( // storeIdがnullまたはundefinedの場合のみ表示
            <p className="text-red-400 text-sm mt-1">店舗情報の取得に失敗しました。</p>
          )}
        </div>

        <hr className="border-gray-700 my-4" />

        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-300 text-lg">お支払い金額</p>
          <p className="text-red-400 text-3xl font-extrabold">¥{amount.toLocaleString()}</p>
        </div>

        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-300 text-lg">現在の残高</p>
          <p className="text-blue-400 text-xl font-bold">¥{balance.toLocaleString()}</p>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-gray-300 text-lg">支払い後の残高</p>
          <p className={`text-xl font-extrabold ${remainingBalance < 0 ? 'text-red-500' : 'text-green-400'}`}>
            ¥{remainingBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {isProcessing ? (
        <div className="flex flex-col items-center justify-center bg-gray-700 p-6 rounded-xl shadow-lg w-full max-w-sm">
          <LoadingSpinner />
          <p className="text-white mt-4">処理中...</p>
        </div>
      ) : (
        <div className="flex flex-col space-y-4 w-full max-w-sm animate-fade-in">
          <p className="text-gray-300 text-lg">上記内容で支払いを行いますか？</p>
          <button
            onClick={handleConfirm}
            className="bg-red-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-red-700 transition-all duration-300 transform active:scale-95"
            disabled={remainingBalance < 0} // 残高不足で無効化
          >
            支払いを確定する
          </button>
          {remainingBalance < 0 && (
            <p className="text-red-400 text-sm">残高が不足しています。</p>
          )}
          <button
            onClick={handleCancel}
            className="bg-gray-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-gray-700 transition-all duration-300 transform active:scale-95"
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentConfirmationScreen;
