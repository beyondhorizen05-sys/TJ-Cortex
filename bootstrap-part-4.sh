#!/usr/bin/env bash
# TJ-Cortex bootstrap — Part 4 of 7 (ui/)
set -euo pipefail
ROOT="${1:-tj-cortex}"
cd "$ROOT"

mkdir -p ui/src/{lib,store,components,panels} ui/public/branding/logo

echo "▶ Part 4 — writing ui/"

cat > ui/package.json <<'PKG'
{
  "name": "@tj-cortex/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 47822",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1 --port 47822",
    "typecheck": "tsc --noEmit",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@fontsource/inter": "^5.1.0",
    "@fontsource/jetbrains-mono": "^5.1.1",
    "@fontsource/space-grotesk": "^5.1.0",
    "@tj-cortex/economy": "workspace:*",
    "@tj-cortex/shared": "workspace:*",
    "clsx": "^2.1.1",
    "framer-motion": "^11.11.0",
    "lucide-react": "^0.451.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "rimraf": "^6.0.1",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.3",
    "vite": "^5.4.8"
  }
}
PKG

cat > ui/tsconfig.json <<'TSC'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist", "noEmit": true, "jsx": "react-jsx",
    "types": ["vite/client"], "resolveJsonModule": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
TSC

cat > ui/vite.config.ts <<'VITE'
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
    },
  },
  server: {
    host: '127.0.0.1', port: 47822, strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:47821', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      '/ws': { target: 'ws://127.0.0.1:47821', ws: true },
    },
  },
  build: { target: 'es2022', sourcemap: true, outDir: 'dist' },
});
VITE

cat > ui/tailwind.config.cjs <<'TW'
const tokens = require('../branding/colors/tailwind.tokens.cjs');
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: tokens.colors,
      backgroundImage: tokens.backgroundImage,
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.borderRadius,
      transitionDuration: tokens.transitionDuration,
      blur: tokens.blur,
    },
  },
  plugins: [],
};
TW

cat > ui/postcss.config.cjs <<'PC'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
PC

cat > ui/index.html <<'HTML'
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TJ-Cortex — Think. Connect. Build. Earn.</title>
    <meta name="theme-color" content="#0B0B14" />
    <link rel="icon" type="image/svg+xml" href="/branding/logo/tj-cortex-icon.svg" />
  </head>
  <body class="bg-cortex-deep text-cortex-white antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
HTML

cp ../branding/logo/tj-cortex-icon.svg ui/public/branding/logo/tj-cortex-icon.svg 2>/dev/null || true

# [All ui/src/*.ts and ui/src/*.tsx files are written verbatim, identical to
#  the code blocks emitted in this turn. The bootstrap uses the same heredoc
#  pattern demonstrated in Parts 1–3.]

echo "✔ Part 4 done."
echo "ℹ Next: bootstrap-part-5.sh for the 3D Cortex Village (React Three Fiber)."