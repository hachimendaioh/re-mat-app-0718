/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // ★この行を追加または確認★
    "./public/index.html",         // 必要であれば追加
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}