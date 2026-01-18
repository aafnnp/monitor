import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { monitorSourceMapPlugin } from '@monitor/cli/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    // 生产环境自动上传 SourceMap（需要先配置 API Key）
    // monitorSourceMapPlugin({
    //   apiKey: process.env.MONITOR_API_KEY || 'your-api-key',
    //   serverUrl: 'http://localhost:8080',
    //   deleteAfterUpload: true,
    //   productionOnly: true,
    // }),
  ],
  build: {
    // 开启 sourcemap 以便调试和错误追踪
    sourcemap: true,
  },
});
