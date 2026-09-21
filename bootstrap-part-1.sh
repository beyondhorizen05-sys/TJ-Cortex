#!/usr/bin/env bash
#
# TJ-Cortex — Think. Connect. Build. Earn.
# Master bootstrap. Runs every part in order, then produces tj-cortex.zip.
#
# Usage:
#   chmod +x bootstrap.sh
#   ./bootstrap.sh [target-directory]
#
# Default target directory: tj-cortex
#
# Requires: bash 4+, and either `zip` (Linux/macOS) or PowerShell (Windows).
# Node.js 22+, pnpm 9+, and Rust stable are required to *build*, but not to
# *reconstruct* the project.
#
set -euo pipefail

ROOT="${1:-tj-cortex}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ---------------------------------------------------------------------------
# Brand banner
# ---------------------------------------------------------------------------
cat <<'BANNER'

  ████████╗     ██╗       ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗
  ╚══██╔══╝     ██║      ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝
     ██║        ██║█████╗██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝
     ██║   ██   ██║╚════╝██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗
     ██║   ╚█████╔╝      ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗
     ╚═╝    ╚════╝        ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝

  Think. Connect. Build. Earn.
  A local-first AI agent runtime with a living 3D village and a self-running
  agent economy. Your agents. Your village. Your economy. Your rules.

BANNER

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
echo "▶ TJ-Cortex bootstrap"
echo "  target:        $ROOT"
echo "  script dir:    $SCRIPT_DIR"
echo "  platform:      $(uname -s 2>/dev/null || echo unknown)"
echo ""

required_parts=(
  "bootstrap-part-1.sh"
  "bootstrap-part-2.sh"
  "bootstrap-part-3.sh"
  "bootstrap-part-4.sh"
  "bootstrap-part-5.sh"
  "bootstrap-part-6.sh"
  "bootstrap-part-7.sh"
)

missing=()
for p in "${required_parts[@]}"; do
  if [ ! -f "$SCRIPT_DIR/$p" ]; then
    missing+=("$p")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "✖ Missing bootstrap parts in $SCRIPT_DIR:"
  for m in "${missing[@]}"; do echo "    - $m"; done
  echo ""
  echo "  All seven parts must be present. Each part was emitted in a"
  echo "  separate turn of the TJ-Cortex build log."
  echo ""
  echo "  Expected files:"
  for p in "${required_parts[@]}"; do echo "    $SCRIPT_DIR/$p"; done
  exit 1
fi

# ---------------------------------------------------------------------------
# Run each part against the target directory
# ---------------------------------------------------------------------------
run_part() {
  local n="$1"
  echo ""
  echo "════════════════════════════════════════════════════════════════════"
  echo "  PART $n / 7"
  echo "════════════════════════════════════════════════════════════════════"
  bash "$SCRIPT_DIR/bootstrap-part-$n.sh" "$ROOT"
}

rm -rf "$ROOT"
mkdir -p "$ROOT"

for n in 1 2 3 4 5 6 7; do
  run_part "$n"
done

# ---------------------------------------------------------------------------
# Post-checks
# ---------------------------------------------------------------------------
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  VERIFY"
echo "════════════════════════════════════════════════════════════════════"

cd "$ROOT"

check_path() {
  if [ -e "$1" ]; then
    echo "  ✔ $1"
  else
    echo "  ✖ $1 (missing)"
    MISSING_FILES=1
  fi
}
MISSING_FILES=0

check_path "package.json"
check_path "pnpm-workspace.yaml"
check_path "tsconfig.base.json"
check_path "README.md"
check_path "branding/logo/tj-cortex-icon.svg"
check_path "branding/BRAND_GUIDELINES.md"
check_path "shared/src/index.ts"
check_path "providers/src/gemini.ts"
check_path "providers/src/deepseek.ts"
check_path "sidecar/src/index.ts"
check_path "sidecar/src/agents/runtime.ts"
check_path "sidecar/src/agents/negotiation.ts"
check_path "sidecar/src/routes/economy.ts"
check_path "ui/src/App.tsx"
check_path "ui/src/panels/TranscriptPanel.tsx"
check_path "ui/src/panels/ProvidersPanel.tsx"
check_path "ui/src/panels/VillageHost.tsx"
check_path "village/src/VillageMount.tsx"
check_path "village/src/scene/Village.tsx"
check_path "economy/src/engine.ts"
check_path "economy/src/ledger.ts"
check_path "desktop/src-tauri/tauri.conf.json"
check_path "desktop/src-tauri/src/lib.rs"
check_path ".github/workflows/build.yml"
check_path "scripts/make-zip.mjs"

if [ "$MISSING_FILES" -ne 0 ]; then
  echo ""
  echo "✖ Some files are missing. The project was written but is incomplete."
  exit 1
fi

# ---------------------------------------------------------------------------
# Produce tj-cortex.zip
# ---------------------------------------------------------------------------
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  PACKAGE"
echo "════════════════════════════════════════════════════════════════════"

if command -v node >/dev/null 2>&1; then
  node scripts/make-zip.mjs
else
  # Fallback to the shell
  if command -v zip >/dev/null 2>&1; then
    rm -f tj-cortex.zip
    zip -r -q tj-cortex.zip . \
      -x "node_modules/*" "*/.git/*" ".git/*" ".tj-cortex/*" "outbox/*" "logs/*" \
         "dist/*" "*/dist/*" "target/*" "*/target/*" ".pnpm-store/*" "tj-cortex.zip"
    echo "✔ tj-cortex.zip created (zip fallback)"
  else
    echo "✖ Neither node nor zip found. Cannot produce tj-cortex.zip."
    echo "  Install Node.js 22+ or the 'zip' package."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  DONE"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "  Project directory:  $ROOT/"
echo "  ZIP:                $ROOT/tj-cortex.zip"
echo ""
echo "  Next steps:"
echo "    1. cd $ROOT"
echo "    2. pnpm install"
echo "    3. pnpm dev                  # sidecar + UI in dev mode"
echo "    4. pnpm tauri:dev            # Tauri 2 desktop app in dev mode"
echo "    5. pnpm tauri:build          # produce .msi / .exe / .deb / .AppImage"
echo ""
echo "  Sign in with Google to use Gemini for free, or paste a DeepSeek key."
echo "  Then create an agent and open The Cortex Village."
echo ""
echo "  Think. Connect. Build. Earn."
echo ""