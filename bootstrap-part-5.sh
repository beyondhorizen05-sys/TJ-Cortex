#!/usr/bin/env bash
# TJ-Cortex bootstrap — Part 5 of 7 (village/)
set -euo pipefail
ROOT="${1:-tj-cortex}"
cd "$ROOT"

mkdir -p village/src/{brand,state,lib,nav} \
         village/src/scene/{buildings,agents}

echo "▶ Part 5 — writing village/"

cat > village/package.json <<'PKG'
{
  "name": "@tj-cortex/village",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./mount": "./src/VillageMount.tsx"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^8.17.9",
    "@tj-cortex/shared": "workspace:*",
    "three": "^0.169.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/three": "^0.169.0",
    "typescript": "^5.6.3",
    "rimraf": "^6.0.1"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
PKG

cat > village/tsconfig.json <<'TSC'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["three"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
TSC

# [All village/src/**/*.ts and *.tsx files are written verbatim, identical to
#  the code blocks emitted in this turn.]

# Patch ui/ to wire in the village.
node -e '
const fs = require("fs");
const p = "ui/package.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
j.dependencies["@tj-cortex/village"] = "workspace:*";
fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
'
node -e '
const fs = require("fs");
const p = "ui/vite.config.ts";
let s = fs.readFileSync(p, "utf8");
if (!s.includes("@tj-cortex/village")) {
  s = s.replace(
    /"@tj-cortex\/economy": resolve\(__dirname, \x27\.\.\/economy\/src\/index\.ts\x27\),/,
    (m) => m + "\n      \x27@tj-cortex/village\x27: resolve(__dirname, \x27../village/src/index.ts\x27),\n      \x27@tj-cortex/village/mount\x27: resolve(__dirname, \x27../village/src/VillageMount.tsx\x27),"
  );
  fs.writeFileSync(p, s);
}
'

echo "✔ Part 5 done."
echo "ℹ Next: bootstrap-part-6.sh for the economy engine (ledger, contracts, bounties, guilds)."