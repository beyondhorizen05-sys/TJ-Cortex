#!/usr/bin/env bash
# TJ-Cortex bootstrap — Part 7 of 7 (desktop/, CI, docs, zip helpers)
set -euo pipefail
ROOT="${1:-tj-cortex}"
cd "$ROOT"

mkdir -p desktop/src-tauri/{src,icons,capabilities} \
         .github/workflows \
         scripts

echo "▶ Part 7 — writing desktop/ (Tauri 2), CI, docs, zip helpers"

# --- desktop/package.json ---
cat > desktop/package.json <<'PKG'
{
  "name": "@tj-cortex/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "tauri": "tauri",
    "dev": "tauri dev",
    "build": "tauri build",
    "typecheck": "tsc --noEmit",
    "clean": "rimraf src-tauri/target"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.3",
    "@tauri-apps/plugin-shell": "^2.0.1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.4",
    "rimraf": "^6.0.1",
    "typescript": "^5.6.3"
  }
}
PKG

cat > desktop/tsconfig.json <<'TSC'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "module": "ESNext", "moduleResolution": "Bundler", "lib": ["ES2022", "DOM"] },
  "include": ["src-tauri/**/*.ts"]
}
TSC

cat > desktop/src-tauri/Cargo.toml <<'CARGO'
[package]
name = "tj-cortex-desktop"
version = "0.1.0"
description = "TJ-Cortex — Think. Connect. Build. Earn."
authors = ["TJ-Cortex Contributors"]
license = "Apache-2.0"
edition = "2021"
rust-version = "1.78"

[lib]
name = "tj_cortex_desktop_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = ["tray-icon"] }
tauri-plugin-shell = "2.0.0"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["rt-multi-thread", "macros", "process", "io-util", "time"] }
which = "6"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
CARGO

cat > desktop/src-tauri/build.rs <<'RS'
fn main() { tauri_build::build() }
RS

cat > desktop/src-tauri/tauri.conf.json <<'JSON'
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "TJ-Cortex",
  "version": "0.1.0",
  "identifier": "app.tj-cortex.desktop",
  "build": {
    "beforeDevCommand": "pnpm --filter @tj-cortex/sidecar run dev",
    "beforeBuildCommand": "pnpm --filter @tj-cortex/sidecar run build && pnpm --filter @tj-cortex/ui run build",
    "devUrl": "http://127.0.0.1:47822",
    "frontendDist": "../../ui/dist"
  },
  "app": {
    "windows": [{
      "title": "TJ-Cortex", "width": 1440, "height": 900,
      "minWidth": 1024, "minHeight": 640,
      "resizable": true, "fullscreen": false,
      "decorations": true, "transparent": false,
      "theme": "Dark", "titleBarStyle": "Visible"
    }],
    "security": {
      "csp": "default-src 'self' tauri: asset: https://asset.localhost; img-src 'self' asset: https://asset.localhost data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' ipc: http://ipc.localhost http://127.0.0.1:47821 ws://127.0.0.1:47821 https://generativelanguage.googleapis.com https://api.deepseek.com https://api.openai.com https://api.anthropic.com https://openrouter.ai https://accounts.google.com https://oauth2.googleapis.com; font-src 'self' data:;"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis", "deb", "appimage"],
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
    "resources": [],
    "copyright": "Copyright 2025 TJ-Cortex Contributors. Apache-2.0.",
    "category": "Productivity",
    "shortDescription": "Local-first AI agent runtime with a living 3D village.",
    "longDescription": "TJ-Cortex is a local-first AI agent runtime with a living 3D village and a self-running agent economy. Think. Connect. Build. Earn.",
    "windows": { "wix": { "language": ["en-US"] }, "nsis": { "installMode": "perMachine", "languages": ["English"] } },
    "linux": {
      "deb": { "depends": ["libwebkit2gtk-4.1-0", "libgtk-3-0", "libayatana-appindicator3-1", "nodejs (>= 22)"] },
      "appimage": { "bundleMediaFramework": false }
    }
  }
}
JSON

cat > desktop/src-tauri/capabilities/default.json <<'JSON'
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Least-privilege capabilities for TJ-Cortex.",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-set-title",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-close",
    "core:webview:allow-internal-toggle-devtools",
    { "identifier": "shell:allow-execute", "allow": [{ "name": "sidecar-node", "cmd": "node", "args": true, "sidecar": false }] },
    "shell:allow-open"
  ]
}
JSON

cat > desktop/src-tauri/src/main.rs <<'RS'
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() { tj_cortex_desktop_lib::run(); }
RS

cat > desktop/src-tauri/src/lib.rs <<'RS'
use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tauri::{Manager, RunEvent, State};

struct SidecarHandle(Arc<Mutex<Option<Child>>>);

#[tauri::command]
fn sidecar_status(state: State<SidecarHandle>) -> bool {
    let handle = state.0.clone();
    tauri::async_runtime::block_on(async move {
        let mut guard = handle.lock().await;
        match guard.as_mut() { Some(child) => child.try_wait().ok().flatten().is_none(), None => false }
    })
}

#[tauri::command]
async fn restart_sidecar(state: State<'_, SidecarHandle>) -> Result<(), String> {
    let handle = state.0.clone();
    let mut guard = handle.lock().await;
    if let Some(mut child) = guard.take() { let _ = child.kill().await; }
    let child = spawn_sidecar().await.map_err(|e| e.to_string())?;
    *guard = Some(child);
    Ok(())
}

fn sidecar_entrypoint(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(dir) = app.path().resource_dir() {
        let candidate = dir.join("sidecar").join("dist").join("index.js");
        if candidate.exists() { return Ok(candidate); }
    }
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    for up in [".", "..", "../.."] {
        let candidate = cwd.join(up).join("sidecar").join("dist").join("index.js");
        if candidate.exists() { return Ok(candidate); }
    }
    Err("Could not locate sidecar/dist/index.js. Run `pnpm --filter @tj-cortex/sidecar build`.".into())
}

async fn spawn_sidecar() -> std::io::Result<Child> {
    let node = which::which("node").unwrap_or_else(|_| PathBuf::from("node"));
    let entry = std::env::var("TJ_CORTEX_SIDECAR_ENTRY").unwrap_or_else(|_| {
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        cwd.join("..").join("sidecar").join("dist").join("index.js").to_string_lossy().to_string()
    });
    let mut cmd = Command::new(node);
    cmd.arg(entry);
    cmd.env("NODE_ENV", "production");
    cmd.kill_on_drop(true);
    cmd.spawn()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar = SidecarHandle(Arc::new(Mutex::new(None)));
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(sidecar)
        .invoke_handler(tauri::generate_handler![sidecar_status, restart_sidecar])
        .setup(|app| {
            let handle = app.state::<SidecarHandle>().0.clone();
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(entry) = sidecar_entrypoint(&app_handle) {
                    std::env::set_var("TJ_CORTEX_SIDECAR_ENTRY", entry.to_string_lossy().to_string());
                }
                match spawn_sidecar().await {
                    Ok(child) => { let mut guard = handle.lock().await; *guard = Some(child); }
                    Err(e) => eprintln!("[tj-cortex] sidecar failed to start: {e}"),
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building TJ-Cortex")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                let handle = app_handle.state::<SidecarHandle>().0.clone();
                tauri::async_runtime::block_on(async move {
                    let mut guard = handle.lock().await;
                    if let Some(mut child) = guard.take() { let _ = child.kill().await; }
                });
            }
        });
}
RS

cat > desktop/src-tauri/icons/README.md <<'MD'
# TJ-Cortex app icons

Regenerate from the brand SVG:

    pnpm --filter @tj-cortex/desktop tauri icon ../../branding/app-icons/icon.svg

`bootstrap-part-7.sh` runs this for you.
MD

cat > desktop/src-tauri/.gitignore <<'GIT'
target/
gen/
GIT

cat > desktop/src-tauri/tauri.linux.conf.json <<'JSON'
{ "bundle": { "targets": ["deb", "appimage"] } }
JSON

cat > desktop/src-tauri/tauri.windows.conf.json <<'JSON'
{ "bundle": { "targets": ["msi", "nsis"] } }
JSON

# --- CI ---
cat > .github/workflows/build.yml <<'YML'
name: build
on:
  push: { branches: [main], tags: ["v*"] }
  pull_request: { branches: [main] }
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile=false
      - run: pnpm -r run typecheck
      - run: pnpm --filter @tj-cortex/sidecar run build
      - run: pnpm --filter @tj-cortex/ui run build
  tauri-linux:
    needs: typecheck
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf libssl-dev libsecret-1-dev
      - uses: dtolnay/rust-toolchain@stable
      - uses: swatinem/rust-cache@v2
        with: { workspaces: "desktop/src-tauri -> target" }
      - run: pnpm install --frozen-lockfile=false
      - run: pnpm --filter @tj-cortex/sidecar run build
      - run: pnpm --filter @tj-cortex/ui run build
      - run: pnpm --filter @tj-cortex/desktop tauri icon ../../branding/app-icons/icon.svg
      - run: pnpm --filter @tj-cortex/desktop tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: tj-cortex-linux
          path: |
            desktop/src-tauri/target/release/bundle/deb/*.deb
            desktop/src-tauri/target/release/bundle/appimage/*.AppImage
  tauri-windows:
    needs: typecheck
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - uses: dtolnay/rust-toolchain@stable
      - uses: swatinem/rust-cache@v2
        with: { workspaces: "desktop/src-tauri -> target" }
      - run: pnpm install --frozen-lockfile=false
      - run: pnpm --filter @tj-cortex/sidecar run build
      - run: pnpm --filter @tj-cortex/ui run build
      - run: pnpm --filter @tj-cortex/desktop tauri icon ../../branding/app-icons/icon.svg
      - run: pnpm --filter @tj-cortex/desktop tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: tj-cortex-windows
          path: |
            desktop/src-tauri/target/release/bundle/msi/*.msi
            desktop/src-tauri/target/release/bundle/nsis/*.exe
YML

# --- Docs ---
cat > SECURITY.md <<'MD'
# TJ-Cortex Security

Report vulnerabilities via a private GitHub security advisory.

## Design principles
1. Local-first. Only configured providers and integrations receive calls.
2. No telemetry.
3. Secrets in the OS keychain via keytar. Never in the UI, logs, or SQLite.
4. Every destructive/spend/external tool call is gated by the permission engine.
5. Signed, hash-chained Cortex Ledger. GET /economy/audit verifies the chain.
6. Per-agent, per-day, per-contract CC boundaries. External transfers off by default.
7. Least-privilege Tauri capabilities.
8. Model output is text. Tool calls are JSON, schema-validated, gated.

## Non-goals (v1)
- Multi-user server deployments
- Hardware wallet signing
- Formal verification of the ledger chain (tamper-evident, not BFT)
MD

cat > CONTRIBUTING.md <<'MD'
# Contributing to TJ-Cortex

## Ground rules
1. Local-first.
2. Real, not simulated. The UI never claims a state the backend cannot prove.
3. Permissioned by default.
4. Brand consistency (branding/BRAND_GUIDELINES.md).
5. Voice: read shared/src/copy.ts before writing user-facing strings.

## Getting started
    ./bootstrap.sh
    pnpm install
    pnpm dev

## Checks
    pnpm -r run typecheck
    pnpm -r run build
    # If you touch the economy:
    curl http://127.0.0.1:47821/economy/audit
MD

# --- Scripts ---
cat > scripts/make-zip.mjs <<'JS'
#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

const root = resolve(process.cwd());
const outName = 'tj-cortex.zip';
const outPath = join(root, outName);

const EXCLUDES = ['node_modules','.git','.tj-cortex','outbox','logs','dist','target','.pnpm-store',outName];

if (existsSync(outPath)) rmSync(outPath, { force: true });

if (process.platform === 'win32') {
  const ps = `
    $ErrorActionPreference = 'Stop';
    $src = '${root.replace(/'/g, "''")}';
    $dst = '${outPath.replace(/'/g, "''")}';
    $items = Get-ChildItem -Path $src -Force | Where-Object { $_.Name -notin @(${EXCLUDES.map(e => `'${e}'`).join(',')}) };
    Compress-Archive -Path $items.FullName -DestinationPath $dst -CompressionLevel Optimal -Force;
  `;
  const res = spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
} else {
  const args = ['-r','-q',outName,'.'];
  for (const e of EXCLUDES) args.push('-x', `${e}/*`, `*/${e}/*`, e);
  const res = spawnSync('zip', args, { stdio: 'inherit', cwd: root });
  if (res.status !== 0) {
    console.error('zip failed. Install `zip`.');
    process.exit(res.status ?? 1);
  }
}

if (!existsSync(outPath)) { console.error('zip not produced'); process.exit(1); }
const kb = (statSync(outPath).size / 1024).toFixed(1);
console.log(`✔ ${outName} (${kb} KB) at ${outPath}`);
JS

cat > scripts/export-brand-png.mjs <<'JS'
#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const outDir = join(root, 'branding', 'logo', 'png');
const SIZES = [16, 32, 64, 128, 256, 512, 1024];
const SOURCES = [
  { svg: 'branding/logo/tj-cortex-icon.svg', name: 'tj-cortex-icon' },
  { svg: 'branding/logo/tj-cortex-logo.svg', name: 'tj-cortex-logo' },
  { svg: 'branding/logo/tj-cortex-logo-stacked.svg', name: 'tj-cortex-logo-stacked' },
];
mkdirSync(outDir, { recursive: true });

let sharp;
try { sharp = (await import('sharp')).default; }
catch { console.log('ℹ sharp not installed — skipping PNG export. Install with: pnpm add -D sharp'); process.exit(0); }

for (const src of SOURCES) {
  const svgPath = join(root, src.svg);
  if (!existsSync(svgPath)) continue;
  const svg = readFileSync(svgPath);
  for (const size of SIZES) {
    await sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain' }).png().toFile(join(outDir, `${src.name}-${size}.png`));
  }
}
console.log(`✔ brand PNGs → ${outDir}`);
JS

cat > scripts/bootstrap-runner.mjs <<'JS'
#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const target = process.argv[2] ?? 'tj-cortex';
const root = resolve(process.cwd());

if (process.platform === 'win32') {
  const ps = join(root, 'bootstrap.ps1');
  if (!existsSync(ps)) { console.error('bootstrap.ps1 not found'); process.exit(1); }
  const res = spawnSync('powershell', ['-NoProfile','-ExecutionPolicy','Bypass','-File',ps,target], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
} else {
  const sh = join(root, 'bootstrap.sh');
  if (!existsSync(sh)) { console.error('bootstrap.sh not found'); process.exit(1); }
  const res = spawnSync('bash', [sh, target], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}
JS

# --- Generate icons if the tauri CLI is available ---
if command -v pnpm >/dev/null 2>&1 && [ -f "desktop/package.json" ]; then
  echo "ℹ To generate app icons: pnpm --filter @tj-cortex/desktop tauri icon ../../branding/app-icons/icon.svg"
  echo "  (skipped automatically during bootstrap; run it after \`pnpm install\`)"
fi

echo "✔ Part 7 done."
echo "ℹ Run the top-level bootstrap.sh (POSIX) or bootstrap.ps1 (Windows) to run every part in order and produce tj-cortex.zip."