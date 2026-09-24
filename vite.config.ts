import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 构建产物使用相对路径，便于部署到任意子目录
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
});
