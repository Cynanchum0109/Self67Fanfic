import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 根据环境变量决定 base 路径
// Vercel 使用根路径，GitHub Pages 使用仓库名路径
// 如果设置了 GITHUB_PAGES 环境变量，使用仓库路径，否则使用根路径
const base = process.env.GITHUB_PAGES === 'true' ? '/Self67Fanfic/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
