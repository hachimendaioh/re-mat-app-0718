// src/screens/StoreMenuManager.js

import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CustomModal from '../components/common/CustomModal';

const StoreMenuManager = ({ db, appId, userId, setModal, setToast }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState(null); // 編集中のアイテム
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [showItemModal, setShowItemModal] = useState(false); // アイテム追加/編集モーダルの表示状態

  // Firestoreからメニューアイテムをリアルタイムで読み込む
  useEffect(() => {
    if (!db || !appId || !userId) {
      console.warn("StoreMenuManager: Firestore not ready or userId missing.");
      setIsLoadingMenu(false);
      return;
    }

    setIsLoadingMenu(true);
    // menuItemsコレクションへの参照パスを定義
    const menuCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/menuItems`);
    const q = query(menuCollectionRef);

    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(items);
      setIsLoadingMenu(false);
      console.log("StoreMenuManager: Menu items updated from Firestore:", items);
    }, (error) => {
      console.error("StoreMenuManager: Error fetching menu items:", error);
      setToast({ message: 'メニューアイテムの取得に失敗しました。', type: 'error' });
      setIsLoadingMenu(false);
    });

    return () => unsubscribe(); // コンポーネメントのアンマウント時にリスナーをクリーンアップ
  }, [db, appId, userId, setToast]);

  // アイテム追加/編集モーダルを開く
  const handleOpenItemModal = useCallback((item = null) => {
    if (item) {
      setIsEditing(true);
      setCurrentItem(item);
      setItemName(item.name);
      setItemPrice(String(item.price)); // 数値型を文字列型に変換してinputに設定
      setItemCategory(item.category || '');
    } else {
      setIsEditing(false);
      setCurrentItem(null);
      setItemName('');
      setItemPrice('');
      setItemCategory('');
    }
    setShowItemModal(true);
  }, []);

  // アイテム追加/編集モーダルを閉じる
  const handleCloseItemModal = useCallback(() => {
    setShowItemModal(false);
    // モーダルを閉じた後に状態をリセット
    setItemName('');
    setItemPrice('');
    setItemCategory('');
    setIsEditing(false);
    setCurrentItem(null);
  }, []);

  // アイテムの保存（追加または更新）
  const handleSaveItem = useCallback(async () => {
    // 入力値のバリデーション
    if (!itemName.trim() || !itemPrice.trim() || isNaN(parseInt(itemPrice))) {
      setToast({ message: 'アイテム名と有効な価格を入力してください。', type: 'error' });
      return;
    }
    
    // 処理中のモーダルを表示
    setModal({
      isOpen: true,
      title: isEditing ? 'アイテムを更新中' : 'アイテムを追加中',
      message: '処理を実行しています...',
      customContent: <LoadingSpinner />,
      showCancelButton: false,
      onConfirm: () => {}, // 処理中はモーダルの確認ボタンを無効化
    });

    try {
      const price = parseInt(itemPrice, 10);
      const data = {
        name: itemName.trim(),
        price: price,
        category: itemCategory.trim() || 'その他', // カテゴリーが空の場合は'その他'を設定
        updatedAt: serverTimestamp(), // 更新日時をFirestoreのサーバータイムスタンプで記録
      };

      if (isEditing && currentItem) {
        // 既存アイテムの更新
        const itemDocRef = doc(db, `artifacts/${appId}/users/${userId}/menuItems`, currentItem.id);
        await updateDoc(itemDocRef, data);
        setToast({ message: 'メニューアイテムを更新しました！', type: 'success' });
        console.log("StoreMenuManager: Menu item updated:", currentItem.id);
      } else {
        // 新しいアイテムの追加
        const menuCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/menuItems`);
        await addDoc(menuCollectionRef, { ...data, createdAt: serverTimestamp() }); // 作成日時も追加
        setToast({ message: '新しいメニューアイテムを追加しました！', type: 'success' });
        console.log("StoreMenuManager: New menu item added.");
      }
      handleCloseItemModal(); // 成功したらモーダルを閉じる
    } catch (error) {
      console.error("StoreMenuManager: Error saving menu item:", error);
      setToast({ message: `アイテムの保存に失敗しました: ${error.message}`, type: 'error' });
    } finally {
      setModal(prev => ({ ...prev, isOpen: false })); // 処理中のモーダルを閉じる
    }
  }, [db, appId, userId, isEditing, currentItem, itemName, itemPrice, itemCategory, setModal, setToast, handleCloseItemModal]);

  // アイテムの削除
  const handleDeleteItem = useCallback(async (item) => {
    // 削除確認モーダルを表示
    setModal({
      isOpen: true,
      title: 'アイテムを削除',
      message: `「${item.name}」を削除してもよろしいですか？この操作は元に戻せません。`,
      showCancelButton: true,
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isOpen: false })); // 確認モーダルを閉じる
        setModal({ // 処理中モーダルを表示
          isOpen: true,
          title: '削除中',
          message: 'アイテムを削除しています...',
          customContent: <LoadingSpinner />,
          showCancelButton: false,
          onConfirm: () => {},
        });
        try {
          const itemDocRef = doc(db, `artifacts/${appId}/users/${userId}/menuItems`, item.id);
          await deleteDoc(itemDocRef);
          setToast({ message: 'メニューアイテムを削除しました！', type: 'success' });
          console.log("StoreMenuManager: Menu item deleted:", item.id);
        } catch (error) {
          console.error("StoreMenuManager: Error deleting menu item:", error);
          setToast({ message: `アイテムの削除に失敗しました: ${error.message}`, type: 'error' });
        } finally {
          setModal(prev => ({ ...prev, isOpen: false })); // 処理中モーダルを閉じる
        }
      },
      onCancel: () => setModal(prev => ({ ...prev, isOpen: false })), // キャンセル時はモーダルを閉じる
    });
  }, [db, appId, userId, setModal, setToast]);

  // メニューアイテム読み込み中の表示
  if (isLoadingMenu) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner />
        <p className="text-gray-300 ml-4">メニューを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-4 text-white font-inter">
      <h3 className="text-2xl font-bold mb-4 text-blue-400">店舗メニュー管理</h3>

      <button
        onClick={() => handleOpenItemModal()}
        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-full font-semibold shadow-md mb-6 transition-all duration-300 transform active:scale-95"
      >
        新しいアイテムを追加
      </button>

      {menuItems.length === 0 ? (
        // メニューアイテムがない場合の表示
        <p className="text-gray-400">登録されているメニューアイテムはありません。</p>
      ) : (
        // メニューアイテムがある場合のリスト表示
        <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
          <h4 className="text-xl font-bold mb-3 text-gray-300">現在のメニュー</h4>
          {menuItems.map(item => (
            <div key={item.id} className="flex justify-between items-center p-3 border-b border-gray-700 last:border-b-0">
              <div>
                <p className="text-lg font-semibold">{item.name}</p>
                <p className="text-sm text-gray-400">カテゴリー: {item.category || 'なし'}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold">¥{item.price.toLocaleString()}</span>
                <button
                  onClick={() => handleOpenItemModal(item)}
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDeleteItem(item)}
                  className="text-red-400 hover:text-red-300 transition-colors duration-200"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* アイテム追加/編集モーダル */}
      {showItemModal && (
        <CustomModal
          isOpen={showItemModal}
          title={isEditing ? 'メニューアイテムを編集' : '新しいメニューアイテムを追加'}
          onConfirm={handleSaveItem}
          onCancel={handleCloseItemModal}
          showCancelButton={true}
          customContent={
            <div className="p-4">
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="itemName">
                アイテム名
              </label>
              <input
                id="itemName"
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
                placeholder="例: オーガニックコーヒー"
              />
              <label className="block text-gray-300 text-sm font-bold mt-4 mb-2" htmlFor="itemPrice">
                価格 (円)
              </label>
              <input
                id="itemPrice"
                type="number"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
                placeholder="例: 500"
              />
               <label className="block text-gray-300 text-sm font-bold mt-4 mb-2" htmlFor="itemCategory">
                カテゴリー (任意)
              </label>
              <input
                id="itemCategory"
                type="text"
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
                placeholder="例: ドリンク"
              />
            </div>
          }
          resetModal={handleCloseItemModal} // モーダルを閉じるためのヘルパー
        />
      )}
    </div>
  );
};

export default StoreMenuManager;
