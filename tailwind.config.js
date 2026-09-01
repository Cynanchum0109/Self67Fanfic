/** @type {import('tailwindcss').Config} */
// 从 cdn.tailwindcss.com（v3）换成本地构建：产物自带样式，离线双击 index.html 也能正常显示
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
