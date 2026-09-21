import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tj-cortex/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@tj-cortex/economy': resolve(__dirname, '../economy/src/index.ts'),
      '@tj-cortex/village': resolve(__dirname, '../village/src/index.ts'),
      '@tj-cortex/village/mount': resolve(__dirname, '../village/src/VillageMount.tsx'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 47822,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:47821', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      '/ws': { target: 'ws://127.0.0.1:47821', ws: true },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },
});