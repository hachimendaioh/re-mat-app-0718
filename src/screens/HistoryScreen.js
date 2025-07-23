import React, { useState, useMemo, useEffect } from 'react'; // useEffectを追加

const HistoryScreen = ({
  history,
  setModal,
  initialSelectedTransactionId, // App.jsから渡される初期選択ID
  initialSelectedTransactionType, // App.jsから渡される初期選択タイプ
  setInitialSelectedHistoryTransactionId, // IDをリセットする関数
  setInitialSelectedHistoryTransactionType // タイプをリセットする関数
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', '1month', '3months', '1year', 'custom'
  const [filterType, setFilterType] = useState('all');   // 'all', 'payment', 'charge', 'receive'
  const [sortOrder, setSortOrder] = useState('newest');  // 'newest', 'oldest', 'amount_desc', 'amount_asc'
  const [startDate, setStartDate] = useState(''); // カスタム期間の開始日 (YYYY-MM-DD)
  const [endDate, setEndDate] = useState('');     // カスタム期間の終了日 (YYYY-MM-DD)

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '日付不明';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const handleItemClick = (record) => {
    setSelectedTransaction(record);
    setModal({
      isOpen: true,
      title: '取引詳細',
      message: '',
      onConfirm: () => setSelectedTransaction(null),
      showCancelButton: false,
      customContent: (
        <div className="text-left text-gray-700">
          <p className="mb-2"><strong className="text-gray-800">店舗/項目:</strong> {record.store}</p>
          <p className="mb-2"><strong className="text-gray-800">金額:</strong> ¥{record.amount.toLocaleString()}</p>
          <p className="mb-2"><strong className="text-gray-800">日時:</strong> {formatTimestamp(record.timestamp)}</p>
          <p className="mb-2"><strong className="text-gray-800">種類:</strong> 
            {record.type === 'charge' ? 'チャージ' :
             record.type === 'payment' ? '支払い' :
             record.type === 'receive' ? '受取' : '不明'}
          </p>
          {record.id && <p className="mb-2 text-sm text-gray-500"><strong>取引ID:</strong> {record.id}</p>}
        </div>
      )
    });
  };

  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...history];

    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.type === filterType);
    }

    const now = new Date();
    filtered = filtered.filter(record => {
      if (!record.timestamp) return false; 
      
      const recordDate = record.timestamp.toDate ? record.timestamp.toDate() : new Date(record.timestamp);

      if (filterPeriod === '1month') {
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return recordDate >= oneMonthAgo;
      } else if (filterPeriod === '3months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        return recordDate >= threeMonthsAgo;
      } else if (filterPeriod === '1year') {
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return recordDate >= oneYearAgo;
      } else if (filterPeriod === 'custom') {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && end) {
          end.setHours(23, 59, 59, 999);
          return recordDate >= start && recordDate <= end;
        } else if (start) {
          return recordDate >= start;
        } else if (end) {
          end.setHours(23, 59, 59, 999);
          return recordDate <= end;
        }
        return true;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
      const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);

      if (sortOrder === 'newest') {
        return dateB.getTime() - dateA.getTime();
      } else if (sortOrder === 'oldest') {
        return dateA.getTime() - dateB.getTime();
      } else if (sortOrder === 'amount_desc') {
        return (b.type === 'receive' ? b.amount : Math.abs(b.amount)) - (a.type === 'receive' ? a.amount : Math.abs(a.amount));
      } else if (sortOrder === 'amount_asc') {
        return (a.type === 'receive' ? a.amount : Math.abs(a.amount)) - (b.type === 'receive' ? b.amount : Math.abs(b.amount));
      }
      return 0;
    });

    return filtered;
  }, [history, filterType, filterPeriod, sortOrder, startDate, endDate]);

  // ★追加: initialSelectedTransactionIdとinitialSelectedTransactionTypeを監視し、モーダルを開くuseEffect ★
  useEffect(() => {
    if (initialSelectedTransactionId && history.length > 0) {
      const transactionToOpen = history.find(
        record => record.id === initialSelectedTransactionId && record.type === initialSelectedTransactionType
      );
      if (transactionToOpen) {
        handleItemClick(transactionToOpen);
      }
      // モーダル表示後、App.jsのStateをリセット
      setInitialSelectedHistoryTransactionId(null);
      setInitialSelectedHistoryTransactionType(null);
    }
  }, [initialSelectedTransactionId, initialSelectedTransactionType, history, setInitialSelectedHistoryTransactionId, setInitialSelectedHistoryTransactionType, setModal]);


  return (
    <div className="p-4 text-white animate-fade-in font-inter">
      <h2 className="text-3xl font-bold mb-6 text-center">取引履歴</h2>

      {/* フィルタリングとソートのUI */}
      <div className="bg-gray-800 p-4 rounded-xl shadow-lg mb-6 animate-slide-in-right">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* 期間フィルタ */}
          <div>
            <label htmlFor="filterPeriod" className="block text-gray-300 text-sm font-bold mb-2">期間:</label>
            <select
              id="filterPeriod"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全て</option>
              <option value="1month">過去1ヶ月</option>
              <option value="3months">過去3ヶ月</option>
              <option value="1year">過去1年</option>
              <option value="custom">カスタム期間</option>
            </select>
          </div>
          {/* 種類フィルタ */}
          <div>
            <label htmlFor="filterType" className="block text-gray-300 text-sm font-bold mb-2">種類:</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全て</option>
              <option value="payment">支払い</option>
              <option value="charge">チャージ</option>
              <option value="receive">受取</option>
            </select>
          </div>
        </div>

        {/* カスタム期間選択UI */}
        {filterPeriod === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 animate-fade-in">
            <div>
              <label htmlFor="startDate" className="block text-gray-300 text-sm font-bold mb-2">開始日:</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-gray-300 text-sm font-bold mb-2">終了日:</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* ソート順 */}
        <div>
          <label htmlFor="sortOrder" className="block text-gray-300 text-sm font-bold mb-2">並び順:</label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="amount_desc">金額（多い順）</option>
            <option value="amount_asc">金額（少ない順）</option>
          </select>
        </div>
      </div>

      {filteredAndSortedHistory.length === 0 ? (
        <p className="text-center text-gray-300">表示する取引履歴はありません。</p>
      ) : (
        <ul className="bg-white rounded-xl shadow-lg text-black divide-y divide-gray-200">
          {filteredAndSortedHistory.map((record) => (
            <li
              key={record.id}
              className="p-4 flex justify-between items-center hover:bg-gray-100 cursor-pointer transition-colors duration-200"
              onClick={() => handleItemClick(record)}
            >
              <div>
                <p className="font-bold text-lg">
                  {record.type === 'receive' ? `受取元: ${record.store}` : record.store}
                </p>
                <p className="text-sm text-gray-500">{formatTimestamp(record.timestamp)}</p>
              </div>
              <span className={`font-bold text-xl ${
                record.type === 'receive' ? 'text-green-500' : 
                record.amount < 0 ? 'text-red-500' : 'text-green-500' 
              }`}>
                {record.type === 'receive' ? '+' : ''}¥{record.amount.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryScreen;
