import React from 'react';

const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <p className="text-white text-xl mt-4">処理中...</p>
    </div>
  </div>
);

export default LoadingSpinner;
