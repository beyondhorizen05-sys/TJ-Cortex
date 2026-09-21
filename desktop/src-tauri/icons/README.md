# TJ-Cortex app icons

Tauri expects, at minimum:

- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS, optional for v1)
- icon.ico (Windows)

Do **not** check binaries into git by hand. Regenerate them from the brand SVG:

```bash
pnpm --filter @tj-cortex/desktop tauri icon ../../branding/app-icons/icon.svg