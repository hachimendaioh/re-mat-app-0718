import React, { useEffect } from 'react';

const CustomModal = ({ title, message, onConfirm, onCancel, showCancelButton = false, customContent = null, resetModal }) => {
  // モーダルが表示されている間、背景のスクロールを無効にする
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleConfirmClick = (e) => {
    e.stopPropagation();
    console.log("CustomModal: OK button clicked. Event stopped propagation.");

    if (onConfirm && typeof onConfirm === 'function') {
      onConfirm();
    } else {
      console.warn("CustomModal: onConfirm function is not provided or is not a function.");
    }
    resetModal(); // モーダルを完全にリセット
  };

  const handleCancelClick = (e) => {
    e.stopPropagation();
    console.log("CustomModal: Cancel button clicked. Event stopped propagation.");

    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    } else {
      console.warn("CustomModal: onCancel function is not provided or is not a function.");
    }
    resetModal(); // モーダルを完全にリセット
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 font-inter" onClick={() => { /* 何もしない */ }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform scale-100 animate-fade-in relative z-50" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">{title}</h3>
        {customContent ? (
          <div className="text-gray-700 mb-6 text-center">{customContent}</div>
        ) : (
          <p className="text-gray-700 mb-6 text-center" style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
        )}
        <div className="flex justify-end space-x-4 mt-4">
          {showCancelButton && (
            <button
              onClick={handleCancelClick}
              className="flex-1 bg-gray-300 text-gray-800 px-6 py-2 rounded-full font-semibold hover:bg-gray-400 transition-all duration-200 transform active:scale-95 shadow-md"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleConfirmClick}
            className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-all duration-300 transform active:scale-95 shadow-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
