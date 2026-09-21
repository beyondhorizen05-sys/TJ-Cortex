# TJ-Cortex - Think. Connect. Build. Earn.
# Master bootstrap for Windows PowerShell.

param(
    [string]$Root = "tj-cortex"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host ""
Write-Host "=============================================="
Write-Host " TJ-CORTEX"
Write-Host " Think. Connect. Build. Earn."
Write-Host "=============================================="
Write-Host ""

Write-Host "TJ-Cortex bootstrap"
Write-Host "  target:     $Root"
Write-Host "  script dir: $ScriptDir"
Write-Host ""

# ------------------------------------------------------------
# Check required bootstrap parts
# ------------------------------------------------------------

$requiredParts = @(
    "bootstrap-part-1.sh",
    "bootstrap-part-2.sh",
    "bootstrap-part-3.sh",
    "bootstrap-part-4.sh",
    "bootstrap-part-5.sh",
    "bootstrap-part-6.sh",
    "bootstrap-part-7.sh"
)

$missing = @()

foreach ($p in $requiredParts) {
    $fullPath = Join-Path $ScriptDir $p

    if (-not (Test-Path $fullPath)) {
        $missing += $p
    }
}

if ($missing.Count -gt 0) {

    Write-Host ""
    Write-Host "ERROR: Missing bootstrap parts in ${ScriptDir}:"
    Write-Host ""

    foreach ($file in $missing) {
        Write-Host "    - $file"
    }

    Write-Host ""
    Write-Host "All seven bootstrap parts must be present."
    Write-Host ""

    exit 1
}

Write-Host "OK: All seven bootstrap parts found."
Write-Host ""

# ------------------------------------------------------------
# Reset target directory
# ------------------------------------------------------------

if (Test-Path $Root) {
    Write-Host "Removing existing target directory:"
    Write-Host "  $Root"
    Write-Host ""

    Remove-Item -Recurse -Force $Root
}

New-Item -ItemType Directory -Force -Path $Root | Out-Null

Write-Host "Created target directory:"
Write-Host "  $Root"
Write-Host ""

# ------------------------------------------------------------
# Find Bash
# ------------------------------------------------------------

$bash = $null

$bashCandidates = @(
    "bash",
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files (x86)\Git\bin\bash.exe"
)

foreach ($candidate in $bashCandidates) {

    try {

        $command = Get-Command $candidate -ErrorAction Stop

        if ($command.Source) {
            $bash = $command.Source
        }
        else {
            $bash = $candidate
        }

        break
    }
    catch {
        # Try next candidate.
    }
}

if (-not $bash) {

    Write-Host ""
    Write-Host "ERROR: bash.exe was not found."
    Write-Host ""
    Write-Host "TJ-Cortex requires Bash because the bootstrap parts"
    Write-Host "are POSIX shell scripts."
    Write-Host ""
    Write-Host "Please install Git for Windows."
    Write-Host ""
    Write-Host "Download:"
    Write-Host "https://git-scm.com/download/win"
    Write-Host ""

    exit 1
}

Write-Host "Bash found:"
Write-Host "  $bash"
Write-Host ""

# ------------------------------------------------------------
# Run bootstrap parts
# ------------------------------------------------------------

for ($n = 1; $n -le 7; $n++) {

    Write-Host ""
    Write-Host "=============================================="
    Write-Host " PART $n / 7"
    Write-Host "=============================================="
    Write-Host ""

    $part = Join-Path $ScriptDir "bootstrap-part-$n.sh"

    if (-not (Test-Path $part)) {

        Write-Host "ERROR: Bootstrap part not found:"
        Write-Host "  $part"
        Write-Host ""

        exit 1
    }

    Write-Host "Running:"
    Write-Host "  $part"
    Write-Host ""

    & $bash $part $Root

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "ERROR: Part $n failed."
        Write-Host "Exit code: $LASTEXITCODE"
        Write-Host ""

        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "PART $n completed successfully."
}

# ------------------------------------------------------------
# Verify generated project
# ------------------------------------------------------------

Write-Host ""
Write-Host "=============================================="
Write-Host " VERIFY"
Write-Host "=============================================="
Write-Host ""

$check = @(
    "package.json",
    "pnpm-workspace.yaml",
    "branding/logo/tj-cortex-icon.svg",
    "shared/src/index.ts",
    "providers/src/gemini.ts",
    "providers/src/deepseek.ts",
    "sidecar/src/index.ts",
    "sidecar/src/agents/runtime.ts",
    "sidecar/src/agents/negotiation.ts",
    "ui/src/App.tsx",
    "ui/src/panels/TranscriptPanel.tsx",
    "ui/src/panels/ProvidersPanel.tsx",
    "ui/src/panels/VillageHost.tsx",
    "village/src/VillageMount.tsx",
    "economy/src/engine.ts",
    "desktop/src-tauri/tauri.conf.json",
    "desktop/src-tauri/src/lib.rs",
    ".github/workflows/build.yml",
    "scripts/make-zip.mjs"
)

$failed = $false

foreach ($f in $check) {

    $p = Join-Path $Root $f

    if (Test-Path $p) {
        Write-Host "  OK   $f"
    }
    else {
        Write-Host "  FAIL $f"
        $failed = $true
    }
}

if ($failed) {

    Write-Host ""
    Write-Host "ERROR: Some required TJ-Cortex files are missing."
    Write-Host ""

    exit 1
}

Write-Host ""
Write-Host "All required files were found."

# ------------------------------------------------------------
# Create ZIP
# ------------------------------------------------------------

Write-Host ""
Write-Host "=============================================="
Write-Host " PACKAGE"
Write-Host "=============================================="
Write-Host ""

Push-Location $Root

try {

    if (Get-Command node -ErrorAction SilentlyContinue) {

        Write-Host "Node.js detected."
        Write-Host "Creating tj-cortex.zip..."
        Write-Host ""

        & node scripts/make-zip.mjs

        if ($LASTEXITCODE -ne 0) {
            throw "make-zip.mjs failed"
        }

    }
    else {

        Write-Host "Node.js was not found."
        Write-Host "Using PowerShell ZIP creation..."
        Write-Host ""

        $zipPath = Join-Path (Get-Location) "tj-cortex.zip"

        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }

        $excludeDirs = @(
            "node_modules",
            ".git",
            ".tj-cortex",
            "outbox",
            "logs",
            "dist",
            "target",
            ".pnpm-store"
        )

        $items = Get-ChildItem -Force |
            Where-Object {
                $excludeDirs -notcontains $_.Name
            }

        Compress-Archive `
            -Path $items.FullName `
            -DestinationPath $zipPath `
            -CompressionLevel Optimal `
            -Force

        Write-Host "OK: tj-cortex.zip created."
    }

}
finally {
    Pop-Location
}

# ------------------------------------------------------------
# Finished
# ------------------------------------------------------------

Write-Host ""
Write-Host "=============================================="
Write-Host " DONE"
Write-Host "=============================================="
Write-Host ""

Write-Host "Project directory:"
Write-Host "  $Root"

Write-Host ""

Write-Host "ZIP:"
Write-Host "  $Root\tj-cortex.zip"

Write-Host ""

Write-Host "Next steps:"
Write-Host "  1. cd $Root"
Write-Host "  2. pnpm install"
Write-Host "  3. pnpm dev"
Write-Host "  4. pnpm tauri:dev"
Write-Host "  5. pnpm tauri:build"

Write-Host ""
Write-Host "Think. Connect. Build. Earn."
Write-Host ""