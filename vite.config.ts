import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import history from 'connect-history-api-fallback';

export default defineConfig({
  plugins: [
    react(),
    {
      // 应用 history 中间件以处理前端路由
      configureServer: (server) => {
        server.middlewares.use(
          history({
            // 设置为 true 以在控制台中打印重定向信息
            verbose: true,
            // 设置为 '/' 以匹配所有路径
            rewrites: [
              { from: /\/.*/, to: '/index.html' },
            ],
          })
        );
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

