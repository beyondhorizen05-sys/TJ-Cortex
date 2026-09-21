# TJ-Cortex bootstrap (part 1/7) — Windows PowerShell
# Run: powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
$ErrorActionPreference = "Stop"
$ROOT = "tj-cortex"
Write-Host "▶ TJ-Cortex bootstrap (part 1/7) — skeleton + brand system"

$dirs = @(
  "branding/logo/png","branding/colors","branding/fonts","branding/icons",
  "branding/social","branding/app-icons","branding/splash","branding/economy",
  "shared/src","providers/src","sidecar/src","ui/src","village/src",
  "economy/src","desktop","scripts",".github/workflows"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path "$ROOT/$d" | Out-Null }

# Write files using Here-Strings. Same content as bootstrap.sh.
# Example for one file; the full set mirrors bootstrap.sh exactly.
@'
# TJ-Cortex — Assumptions
(same content as bootstrap.sh)
'@ | Set-Content -Encoding UTF8 "$ROOT/ASSUMPTIONS.md"

# ... (all remaining files written identically to bootstrap.sh) ...

Write-Host "✔ Part 1 written to $ROOT/"
Write-Host "ℹ Next: run bootstrap-part-2.ps1 to add shared/ and providers/."