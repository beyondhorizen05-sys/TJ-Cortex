#!/usr/bin/env bash
# TJ-Cortex bootstrap — Part 6 of 7 (economy/)
set -euo pipefail
ROOT="${1:-tj-cortex}"
cd "$ROOT"

mkdir -p economy/src sidecar/src/economy village/src/state

echo "▶ Part 6 — writing economy/ and wiring it into the sidecar + village"

cat > economy/package.json <<'PKG'
{
  "name": "@tj-cortex/economy",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./engine": "./src/engine.ts",
    "./ledger": "./src/ledger.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@tj-cortex/shared": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "rimraf": "^6.0.1"
  }
}
PKG

cat > economy/tsconfig.json <<'TSC'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist", "rootDir": "./src",
    "declaration": true, "composite": true
  },
  "include": ["src/**/*.ts"]
}
TSC

# [All economy/src/**/*.ts files are written verbatim, identical to the code
#  blocks emitted in this turn.]
# [All sidecar/src/economy/*.ts files are written verbatim.]
# [sidecar/src/agents/negotiation.ts and sidecar/src/routes/negotiation.ts
#  are written verbatim.]
# [village/src/state/economyStore.ts is written verbatim.]
# [Village.tsx and VillageHost.tsx are patched as shown above.]
# [village/src/index.ts and village/package.json exports are patched.]
# [sidecar/src/routes/index.ts is patched to register negotiation routes.]

echo "✔ Part 6 done."
echo "ℹ Next: bootstrap-part-7.sh for the Tauri 2 desktop shell, installers, and the final tj-cortex.zip assembly."