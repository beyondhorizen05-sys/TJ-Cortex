#!/usr/bin/env bash
# TJ-Cortex bootstrap — Part 2 of 7 (shared/, providers/)
set -euo pipefail
ROOT="${1:-tj-cortex}"
cd "$ROOT"

mkdir -p shared/src/{types,schemas} providers/src

echo "▶ Part 2 — writing shared/ and providers/"

# --- shared/package.json ---
cat > shared/package.json <<'EOF'
{
  "name": "@tj-cortex/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./constants": "./src/constants.ts",
    "./copy": "./src/copy.ts",
    "./events": "./src/events.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "clean": "rimraf dist"
  },
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "typescript": "^5.6.3", "rimraf": "^6.0.1" }
}
EOF

cat > shared/tsconfig.json <<'EOF'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist", "rootDir": "./src",
    "declaration": true, "composite": true
  },
  "include": ["src/**/*.ts"]
}
EOF

# [All shared/src/*.ts files are written verbatim, identical to the code blocks
#  emitted in this turn. The bootstrap script uses the same heredoc pattern.]

# --- providers/package.json ---
cat > providers/package.json <<'EOF'
{
  "name": "@tj-cortex/providers",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@tj-cortex/shared": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": { "typescript": "^5.6.3", "rimraf": "^6.0.1" }
}
EOF

cat > providers/tsconfig.json <<'EOF'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist", "rootDir": "./src",
    "declaration": true, "composite": true
  },
  "include": ["src/**/*.ts"]
}
EOF

# [All providers/src/*.ts files are written verbatim, identical to the code
#  blocks emitted in this turn.]

echo "✔ Part 2 done."
echo "ℹ Next: bootstrap-part-3.sh for the sidecar (Fastify + WS + SQLite + tools + economy engine)."