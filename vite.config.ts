import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      input: {
        dashboard: path.resolve(__dirname, 'index.html'),
        'test-full-flow': path.resolve(__dirname, 'test-full-flow.html'),
      },
    },
    sourcemap: false, // Production에서 source map 비활성화
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 디버깅을 위해 임시 활성화
        drop_debugger: true,
      },
    },
  },
})
