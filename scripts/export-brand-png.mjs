#!/usr/bin/env node
/**
 * Export brand SVGs to PNGs at the standard sizes, using `sharp` if it is
 * available. If `sharp` is not installed, print instructions and exit 0 so
 * the overall build does not fail.
 *
 * Add `sharp` to devDependencies if you want automatic PNG export:
 *   pnpm add -D sharp
 */
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
try {
  sharp = (await import('sharp')).default;
} catch {
  console.log('ℹ sharp is not installed — skipping PNG export.');
  console.log('  Install it with: pnpm add -D sharp');
  console.log('  Then re-run: pnpm run brand:png');
  process.exit(0);
}

for (const src of SOURCES) {
  const svgPath = join(root, src.svg);
  if (!existsSync(svgPath)) {
    console.log(`skip ${src.svg} (not found)`);
    continue;
  }
  const svg = readFileSync(svgPath);
  for (const size of SIZES) {
    const out = join(outDir, `${src.name}-${size}.png`);
    await sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain' }).png().toFile(out);
    console.log(`✔ ${src.name}-${size}.png`);
  }
}
console.log(`\nBrand PNGs written to ${outDir}`);