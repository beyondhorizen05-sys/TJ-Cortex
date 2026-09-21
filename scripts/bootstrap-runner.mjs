#!/usr/bin/env node
/**
 * Shared bootstrap runner. Detects the platform and hands off to either
 * `bootstrap.sh` (POSIX) or `bootstrap.ps1` (Windows), passing through the
 * target directory argument. Node-only so it works on a bare install.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const target = process.argv[2] ?? 'tj-cortex';
const root = resolve(process.cwd());

if (process.platform === 'win32') {
  const ps = join(root, 'bootstrap.ps1');
  if (!existsSync(ps)) {
    console.error('bootstrap.ps1 not found next to bootstrap-runner.mjs');
    process.exit(1);
  }
  const res = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps, target], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
} else {
  const sh = join(root, 'bootstrap.sh');
  if (!existsSync(sh)) {
    console.error('bootstrap.sh not found next to bootstrap-runner.mjs');
    process.exit(1);
  }
  const res = spawnSync('bash', [sh, target], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}