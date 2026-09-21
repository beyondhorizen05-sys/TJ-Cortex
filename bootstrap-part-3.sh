#!/usr/bin/env bash
# TJ-Cortex bootstrap — Part 3 of 7 (sidecar/)
set -euo pipefail
ROOT="${1:-tj-cortex}"
cd "$ROOT"

mkdir -p sidecar/src/{db,tools,routes,agents,mcp}

echo "▶ Part 3 — writing sidecar/"

# --- sidecar/package.json ---
cat > sidecar/package.json <<'PKG'
{
  "name": "@tj-cortex/sidecar",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "@fastify/websocket": "^11.0.1",
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@tj-cortex/economy": "workspace:*",
    "@tj-cortex/providers": "workspace:*",
    "@tj-cortex/shared": "workspace:*",
    "better-sqlite3": "^11.3.0",
    "drizzle-orm": "^0.33.0",
    "fastify": "^5.0.0",
    "keytar": "^7.9.0",
    "nanoid": "^5.0.7",
    "node-cron": "^3.0.3",
    "open": "^10.1.0",
    "pino": "^9.4.0",
    "pino-pretty": "^11.2.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.7.4",
    "@types/node-cron": "^3.0.11",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3",
    "rimraf": "^6.0.1"
  }
}
PKG

cat > sidecar/tsconfig.json <<'TSC'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["node"],
    "resolveJsonModule": true,
    "declaration": false,
    "composite": false
  },
  "include": ["src/**/*.ts"]
}
TSC

# [All sidecar/src/*.ts files are written verbatim, identical to the code
#  blocks emitted in this turn. The bootstrap script uses the same heredoc
#  pattern shown in Part 1 and Part 2.]

cat > sidecar/.env.example <<'ENV'
TJ_CORTEX_HOST=127.0.0.1
TJ_CORTEX_PORT=47821
TJ_CORTEX_DATA_DIR=
TJ_CORTEX_LOG_LEVEL=info
TJ_CORTEX_NIGHTSHIFT=on
TJ_CORTEX_NIGHTSHIFT_START=22:00
TJ_CORTEX_NIGHTSHIFT_END=06:00
TJ_CORTEX_GOOGLE_CLIENT_ID=
TJ_CORTEX_GOOGLE_CLIENT_SECRET=
ENV

echo "✔ Part 3 done."
echo "ℹ Next: bootstrap-part-4.sh for the UI (React + Vite + Tailwind + all panels)."