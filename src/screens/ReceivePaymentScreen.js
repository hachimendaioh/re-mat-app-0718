// src/screens/ReceivePaymentScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
// QRious はCDNで読み込まれるため、ここではインポート不要です。

import { getAuth } from 'firebase/auth'; // ユーザー認証状態の確認
<<<<<<< HEAD
import { collection, doc, setDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore'; // FirestoreのインポートとonSnapshotを追加
=======
import { collection, doc, setDoc, serverTimestamp, query, onSnapshot, writeBatch } from 'firebase/firestore'; // FirestoreのインポートとonSnapshot, writeBatchを追加
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
import LoadingSpinner from '../components/common/LoadingSpinner'; // LoadingSpinnerをインポート

// dbとappId、isStoreModeをpropsとして受け取る
const ReceivePaymentScreen = ({ userId, userName, setScreen, setModal, db, appId, isStoreMode, storeName: userStoreName }) => { // storeNameをuserStoreNameとして受け取る
  const [qrData, setQrData] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedItems, setSelectedItems] = useState({});
  const [qrError, setQrError] = useState('');
  const [showMenu, setShowMenu] = useState(true); // メニュー表示/金額直接入力を切り替える
  const [directAmount, setDirectAmount] = useState(''); // 金額直接入力用
  const [isQrGenerated, setIsQrGenerated] = useState(false); 
  const [isSavingOrder, setIsSavingOrder] = useState(false); // 注文保存中のローディング状態
  const [menuItems, setMenuItems] = useState([]); // Firestoreから読み込むメニューアイテム
  const [isLoadingMenu, setIsLoadingMenu] = useState(true); // メニュー読み込み中の状態

  // QRコードを描画するcanvas要素への参照
  const qrCanvasRef = useRef(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isAnonymousUser = currentUser?.isAnonymous;

  // Firestoreからメニューアイテムをリアルタイムで読み込む
  useEffect(() => {
    if (!db || !appId || !userId) {
      console.warn("ReceivePaymentScreen: Firestore not ready or userId missing. Cannot fetch menu items.");
      setIsLoadingMenu(false);
      return;
    }
    // 店舗モードでなければメニューは読み込まない
    if (!isStoreMode) {
      console.log("ReceivePaymentScreen: Not in store mode. Skipping menu item fetch.");
      setIsLoadingMenu(false);
      setMenuItems([]); // メニューアイテムをクリア
      setShowMenu(false); // 金額直接入力モードに切り替え
      return;
    }

    setIsLoadingMenu(true);
    const menuCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/menuItems`);
    const q = query(menuCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(items);
      setIsLoadingMenu(false);
      console.log("ReceivePaymentScreen: Menu items updated from Firestore:", items);
    }, (error) => {
      console.error("ReceivePaymentScreen: Error fetching menu items:", error);
      setModal({
        isOpen: true,
        title: 'メニュー読み込みエラー',
        message: `メニューアイテムの取得に失敗しました。\n詳細: ${error.message || error.toString()}`,
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      setIsLoadingMenu(false);
    });

    return () => unsubscribe(); // クリーンアップ
  }, [db, appId, userId, isStoreMode, setModal]);

  // 合計金額を計算する関数 (動的に読み込んだmenuItemsを使用)
  const calculateTotal = useCallback(() => {
    let total = 0;
    Object.keys(selectedItems).forEach(itemId => {
      const item = menuItems.find(i => i.id === itemId); // menuItemsを使用
      if (item) {
        total += item.price * selectedItems[itemId];
      }
    });
    setTotalAmount(total);
  }, [selectedItems, menuItems]); // menuItemsを依存配列に追加

  useEffect(() => {
    if (showMenu) {
      calculateTotal();
    }
  }, [selectedItems, showMenu, calculateTotal]);

  // qrDataが変更されたときにQRコードをcanvasに描画
  useEffect(() => {
    console.log("ReceivePaymentScreen: useEffect for qrData triggered. qrData:", qrData);
    if (qrData && qrCanvasRef.current) {
      console.log("ReceivePaymentScreen: Attempting to draw QR code on canvas.");
      if (window.QRious) {
        new window.QRious({
          element: qrCanvasRef.current,
          value: qrData,
          size: 350, 
          background: '#FFFFFF', 
          foreground: '#000000', 
          level: 'H' 
        });
        setIsQrGenerated(true);
        console.log("ReceivePaymentScreen: QR code drawn successfully.");
      } else {
        console.error("ReceivePaymentScreen: window.QRious is not defined. Make sure QRious CDN is loaded in index.html.");
        setQrError("QRコードライブラリが読み込まれていません。");
        setIsQrGenerated(false);
      }
    } else {
      console.log("ReceivePaymentScreen: qrData is empty or qrCanvasRef.current is null. Not drawing QR code.");
      setIsQrGenerated(false);
    }
  }, [qrData]);

  const handleToggleItem = (itemId) => {
    setSelectedItems(prevItems => {
      const newItems = { ...prevItems };
      if (newItems[itemId]) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = 1; // 数量は一旦1で固定
      }
      return newItems;
    });
  };

  const handleGenerateQrCode = async () => {
    console.log("ReceivePaymentScreen: handleGenerateQrCode called.");

    if (isAnonymousUser) {
      console.log("ReceivePaymentScreen: Anonymous user detected. Showing restriction modal.");
      setModal({
        isOpen: true,
        title: '機能制限',
        message: 'QRコードを生成するには、アカウント登録が必要です。',
        onConfirm: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          setScreen('register');
        },
        showCancelButton: false,
      });
      return;
    }

    let finalAmount = showMenu ? totalAmount : parseInt(directAmount, 10);
    console.log("ReceivePaymentScreen: Final amount calculated:", finalAmount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      console.log("ReceivePaymentScreen: Invalid amount. Setting QR error.");
      setQrError('有効な金額を入力またはメニューを選択してください。');
      return;
    }
    // Stripe最小金額バリデーション
    if (finalAmount < 50) {
      console.log("ReceivePaymentScreen: Amount is less than Stripe minimum (¥50). Setting QR error.");
      setQrError('送金金額は50円以上にしてください。');
      return;
    }

<<<<<<< HEAD
    // ★追加: 店舗モードと金額直接入力の組み合わせに対するバリデーション ★
    if (isStoreMode && !showMenu) {
      setQrError('店舗モードではメニュー選択が必要です。個人間の送金をする場合は店舗モードをOFFにしてください。');
      setModal({
        isOpen: true,
        title: '機能制限',
        message: '店舗モードが有効な場合、メニューから商品を選択してQRコードを生成してください。個人間の送金をする場合は、アカウント画面で店舗モードをOFFにしてください。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
      return;
    }
    // ★追加ここまで ★


=======
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
    const receiverDisplayName = isStoreMode && userStoreName ? userStoreName : userName;

    let qrPayload = {
      receiverId: userId,
      receiverName: receiverDisplayName,
      amount: finalAmount,
    };
    
    // メニュー選択時はFirestoreに注文を保存し、orderIdをQRに含める
<<<<<<< HEAD
    if (showMenu && Object.keys(selectedItems).length > 0) {
=======
    // 店舗モードでメニュー選択がされている場合
    if (isStoreMode && showMenu && Object.keys(selectedItems).length > 0) {
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
        if (!db || !appId) {
            setQrError("Firestoreが初期化されていません。");
            return;
        }

        setIsSavingOrder(true); 
        setQrError(''); 
        setModal({
            isOpen: true,
            title: '注文を準備中',
            message: 'QRコード生成のため、注文内容を準備しています...',
            customContent: <LoadingSpinner />,
            showCancelButton: false,
            onConfirm: () => {},
        });

        try {
            const itemsList = Object.keys(selectedItems).map(itemId => {
                const item = menuItems.find(i => i.id === itemId);
                return {
                    id: item.id, 
                    name: item.name,
                    price: item.price,
                    quantity: selectedItems[itemId],
                };
            });

            const ordersCollectionRef = collection(db, `artifacts/${appId}/orders`);
            const newOrderDocRef = doc(ordersCollectionRef); 
            const orderId = newOrderDocRef.id; 

            await setDoc(newOrderDocRef, {
                receiverId: userId,
                receiverName: receiverDisplayName,
                amount: finalAmount,
                items: itemsList,
                createdAt: serverTimestamp(),
                status: 'pending',
            });

<<<<<<< HEAD
=======
            // ★修正: 受取側の取引履歴に「受取」として記録し、transactionIdを含める ★
            const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
            const newTransactionRef = doc(transactionsColRef); // 新しいトランザクションの参照を取得
            const transactionId = newTransactionRef.id; // トランザクションIDを取得
            await setDoc(newTransactionRef, {
              store: 'RE-Matユーザー', // 送金元がRE-Matユーザーであることを示す
              amount: finalAmount,
              date: serverTimestamp(),
              type: 'receive', // 新しいタイプ 'receive'
              notification_type: 'info',
              timestamp: serverTimestamp(),
              orderId: orderId, // 関連するorderId
            });
            console.log("ReceivePaymentScreen: 'Receive' transaction recorded for receiver with ID:", transactionId);

            // ★修正: 受取通知を記録し、transactionIdとtransactionTypeを含める ★
            const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
            await setDoc(doc(notificationsColRef), {
              text: `¥${finalAmount.toLocaleString()}を受け取りました。`,
              read: false,
              type: 'receive', // 通知タイプを'receive'に設定
              timestamp: serverTimestamp(),
              transactionId: transactionId, // 関連するトランザクションID
              transactionType: 'receive', // 関連するトランザクションタイプ
            });
            console.log("ReceivePaymentScreen: 'Receive' notification recorded for receiver.");


>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
            console.log("ReceivePaymentScreen: Order saved to Firestore with ID:", orderId);
            qrPayload.orderId = orderId; 

        } catch (error) {
<<<<<<< HEAD
            console.error("ReceivePaymentScreen: Failed to save order to Firestore:", error);
            setQrError(`注文の準備に失敗しました: ${error.message || error.toString()}`);
=======
            console.error("ReceivePaymentScreen: Failed to save order or record transaction:", error);
            setQrError(`注文の準備または取引記録に失敗しました: ${error.message || error.toString()}`);
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
            setIsQrGenerated(false);
            setModal({
                isOpen: true,
                title: 'エラー',
<<<<<<< HEAD
                message: `注文の準備に失敗しました。\n詳細: ${error.message || error.toString()}`,
=======
                message: `注文の準備または取引記録に失敗しました。\n詳細: ${error.message || error.toString()}`,
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
                onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
                showCancelButton: false,
            });
            setIsSavingOrder(false); 
            return; 
        } finally {
            setModal(prev => ({ ...prev, isOpen: false })); 
            setIsSavingOrder(false); 
        }
    }
<<<<<<< HEAD
    else if (!showMenu && finalAmount > 0) {
        console.log("ReceivePaymentScreen: Direct amount input. Generating QR without orderId.");
    } else {
        console.log("ReceivePaymentScreen: No menu items selected or invalid direct amount. Cannot generate QR.");
=======
    // 店舗モードではない、または店舗モードだがメニュー選択をしていない（金額直接入力）場合
    // この場合はorderIdは生成せず、QRコードに直接金額を含める
    else if ((!isStoreMode && finalAmount > 0) || (isStoreMode && !showMenu && finalAmount > 0)) {
        console.log("ReceivePaymentScreen: Direct amount input (or non-store mode). Generating QR without orderId.");
        // orderIdはqrPayloadに含めない

        // ★修正: 個人間送金（金額直接入力）の場合の受取側の取引履歴記録にtransactionIdを含める ★
        if (!db || !appId) {
          setQrError("Firestoreが初期化されていません。");
          return;
        }
        try {
          const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
          const newTransactionRef = doc(transactionsColRef); // 新しいトランザクションの参照を取得
          const transactionId = newTransactionRef.id; // トランザクションIDを取得
          await setDoc(newTransactionRef, {
            store: '個人間送金', // 送金元が個人であることを示す
            amount: finalAmount,
            date: serverTimestamp(),
            type: 'receive', // 新しいタイプ 'receive'
            notification_type: 'info',
            timestamp: serverTimestamp(),
          });
          console.log("ReceivePaymentScreen: 'Receive' (P2P) transaction recorded for receiver with ID:", transactionId);

          // ★修正: 受取通知を記録し、transactionIdとtransactionTypeを含める ★
          const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
          await setDoc(doc(notificationsColRef), {
            text: `¥${finalAmount.toLocaleString()}を受け取りました。`,
            read: false,
            type: 'receive',
            timestamp: serverTimestamp(),
            transactionId: transactionId, // 関連するトランザクションID
            transactionType: 'receive', // 関連するトランザクションタイプ
          });
          console.log("ReceivePaymentScreen: 'Receive' (P2P) notification recorded for receiver.");

        } catch (error) {
          console.error("ReceivePaymentScreen: Failed to record P2P receive transaction:", error);
          setQrError(`受取取引の記録に失敗しました: ${error.message || error.toString()}`);
          setIsQrGenerated(false);
          setModal({
            isOpen: true,
            title: 'エラー',
            message: `受取取引の記録に失敗しました。\n詳細: ${error.message || error.toString()}`,
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
            showCancelButton: false,
          });
          return;
        }
    } else {
        console.log("ReceivePaymentScreen: No valid input to generate QR.");
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
        setQrError('有効な金額を入力するか、メニューを選択してください。');
        return;
    }


    console.log("ReceivePaymentScreen: QR Payload:", qrPayload);

    try {
      const payloadString = JSON.stringify(qrPayload);
      console.log("ReceivePaymentScreen: Payload stringified:", payloadString);
      
      const encoder = new TextEncoder();
      const encodedBytes = encoder.encode(payloadString);
      const encodedPayload = btoa(String.fromCharCode(...encodedBytes));
      console.log("ReceivePaymentScreen: Payload encoded to Base64:", encodedPayload);

      setQrData(encodedPayload);
      setQrError('');
      setIsQrGenerated(true); 
      console.log("ReceivePaymentScreen: setQrData and setIsQrGenerated(true) called.");
    } catch (error) {
      console.error("QR Code generation failed:", error);
      setQrError(`QRコードの生成に失敗しました: ${error.message || error.toString()}`);
      setIsQrGenerated(false);
    }
  };

  const handleCopyQrData = () => {
    if (qrData) {
      document.execCommand('copy'); // navigator.clipboard.writeText()の代替
      setModal({
        isOpen: true,
        title: 'コピー完了',
        message: 'QRコードのデータがクリップボードにコピーされました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } else {
      setModal({
        isOpen: true,
        title: 'コピー失敗',
        message: 'コピーするQRデータがありません。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    }
  };

  const handleDownloadQrCode = () => {
    if (qrCanvasRef.current && isQrGenerated) {
      const url = qrCanvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `remat_qr_code_${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setModal({
        isOpen: true,
        title: 'ダウンロード完了',
        message: 'QRコード画像をダウンロードしました。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    } else {
      setModal({
        isOpen: true,
        title: 'エラー',
        message: 'QRコードの画像をダウンロードできませんでした。',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
        showCancelButton: false,
      });
    }
  };

  return (
    <div className="p-4 text-white text-center flex flex-col items-center font-inter animate-fade-in">
      <h2 className="text-3xl font-bold mb-6">QRコードで受け取る</h2>

      {isAnonymousUser && (
        <div className="bg-yellow-600 rounded-xl p-4 mb-4 w-full max-w-md text-sm">
          <p>ゲストユーザーはQRコードを生成できません。</p>
          <p>アカウントを登録して、この機能をご利用ください。</p>
        </div>
      )}

      {/* QRコード表示エリア */}
      <div className={`relative mb-6 w-full max-w-sm flex items-center justify-center animate-slide-in-right ${isAnonymousUser ? 'opacity-50' : ''} mx-auto`}>
        <div className="relative bg-gray-700 rounded-lg p-6 flex items-center justify-center" style={{ width: '398px', height: '398px' }}>
          {isQrGenerated ? (
            <canvas ref={qrCanvasRef} width="350" height="350" className="rounded-lg block"></canvas>
          ) : (
            <div className="w-[350px] h-[350px] bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-lg">QRコードがここに表示されます</span>
            </div>
          )}
        </div>
      </div>

      <div className={`w-full max-w-sm mb-6 ${isAnonymousUser ? 'opacity-50' : ''}`}>
        {/* メニュー切り替えボタン */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setShowMenu(true)}
            className={`px-4 py-2 rounded-l-full text-sm font-semibold transition-all duration-300 ${showMenu ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            disabled={!isStoreMode} // 店舗モードでない場合は無効化
          >
            メニューから選択
          </button>
          <button
            onClick={() => setShowMenu(false)}
            className={`px-4 py-2 rounded-r-full text-sm font-semibold transition-all duration-300 ${!showMenu ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            金額を直接入力
          </button>
        </div>

        {isStoreMode ? ( // 店舗モードの場合のみメニュー選択を表示
          showMenu ? (
            // メニュー選択モード
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold mb-3 text-blue-300">メニュー</h3>
              {isLoadingMenu ? (
                <div className="flex justify-center items-center h-24">
                  <LoadingSpinner />
                  <p className="text-gray-300 ml-2">メニューを読み込み中...</p>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  <p>メニューアイテムが登録されていません。</p>
                  <p>アカウント画面の店舗設定からメニューを登録してください。</p>
                </div>
              ) : (
                <>
                  {menuItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-colors duration-200
                        ${selectedItems[item.id] ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      <span className="text-sm font-semibold">{item.name}</span>
                      <span className="text-sm">¥{item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </>
              )}
              <hr className="border-gray-600 my-4" />
              <div className="flex justify-between items-center text-xl font-bold">
                <span>合計金額</span>
                <span>¥{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            // 金額直接入力モード (店舗モードでも利用可能)
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold mb-3 text-blue-300">金額を直接入力</h3>
<<<<<<< HEAD
              {/* ★追加: 店舗モード時の金額直接入力に関する注意書き ★ */}
              <p className="text-red-300 text-sm mb-4">
                店舗モードでは、メニュー選択が推奨されます。<br/>
                個人ユーザーへの送金をする場合は、アカウント画面で店舗モードをOFFにしてください。
=======
              {/* 店舗モード時の金額直接入力に関する注意書き */}
              <p className="text-gray-400 text-sm mb-4">
                店舗モードでは、メニュー選択が推奨されます。<br/>
                メニューにない商品や個人間の送金の場合は、こちらをご利用ください。
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
              </p>
              <input
                type="number"
                value={directAmount}
                onChange={(e) => {
                  setDirectAmount(e.target.value);
                  setQrError('');
                }}
                placeholder="¥"
                className="w-full p-3 rounded-lg text-black text-2xl font-bold text-center mb-4 bg-gray-100"
                disabled={isAnonymousUser}
              />
<<<<<<< HEAD
=======
              {/* 50円未満の金額に対するUI上の警告 */}
              {directAmount !== '' && parseInt(directAmount, 10) < 50 && parseInt(directAmount, 10) > 0 && (
                <p className="text-red-400 text-sm mt-2">送金金額は50円以上にしてください。</p>
              )}
>>>>>>> 84e4295d3e1fab44aca1566d06ae881be4c54421
            </div>
          )
        ) : ( // 店舗モードでない場合、金額直接入力のみ
          <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-blue-300">金額を直接入力</h3>
            <p className="text-gray-400 text-sm mb-4">
              店舗モードが有効でないため、メニュー選択はできません。
            </p>
            <input
              type="number"
              value={directAmount}
              onChange={(e) => {
                setDirectAmount(e.target.value);
                setQrError('');
              }}
              placeholder="¥"
              className="w-full p-3 rounded-lg text-black text-2xl font-bold text-center mb-4 bg-gray-100"
              disabled={isAnonymousUser}
            />
            {/* 50円未満の金額に対するUI上の警告 */}
            {directAmount !== '' && parseInt(directAmount, 10) < 50 && parseInt(directAmount, 10) > 0 && (
              <p className="text-red-400 text-sm mt-2">送金金額は50円以上にしてください。</p>
            )}
          </div>
        )}
      </div>

      {qrError && <p className="text-red-400 mb-4">{qrError}</p>}
      <div className={`w-full max-w-sm flex flex-col space-y-4 ${isAnonymousUser ? 'opacity-50' : ''}`}>
        <button
          onClick={handleGenerateQrCode}
          className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
          disabled={isAnonymousUser || isSavingOrder} // 注文保存中は無効化
        >
          {isSavingOrder ? <LoadingSpinner size="sm" /> : 'QRコードを生成'}
        </button>
        {isQrGenerated && (
          <>
            <button
              onClick={handleCopyQrData}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
            >
              QRデータをコピー
            </button>
            <button
              onClick={handleDownloadQrCode}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
            >
              QRコードをダウンロード
            </button>
          </>
        )}
        <button
          onClick={() => setScreen('home')}
          className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-full font-bold shadow-lg transition-all duration-300 transform active:scale-95"
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default ReceivePaymentScreen;
