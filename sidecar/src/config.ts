import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { SIDECAR_DEFAULT_HOST, SIDECAR_DEFAULT_PORT } from '@tj-cortex/shared';

const DATA_DIR = process.env.TJ_CORTEX_DATA_DIR
  ?? join(homedir(), '.tj-cortex');

export const config = {
  host: process.env.TJ_CORTEX_HOST ?? SIDECAR_DEFAULT_HOST,
  port: Number(process.env.TJ_CORTEX_PORT ?? SIDECAR_DEFAULT_PORT),
  dataDir: DATA_DIR,
  dbPath: join(DATA_DIR, 'cortex.sqlite'),
  outboxDir: join(DATA_DIR, 'outbox'),
  logsDir: join(DATA_DIR, 'logs'),
  workspaceDir: join(DATA_DIR, 'workspace'),
  googleClientId: process.env.TJ_CORTEX_GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.TJ_CORTEX_GOOGLE_CLIENT_SECRET ?? '',
  logLevel: process.env.TJ_CORTEX_LOG_LEVEL ?? 'info',
  nightShift: {
    start: process.env.TJ_CORTEX_NIGHTSHIFT_START ?? '22:00',
    end: process.env.TJ_CORTEX_NIGHTSHIFT_END ?? '06:00',
    enabled: process.env.TJ_CORTEX_NIGHTSHIFT !== 'off',
  },
} as const;

export function ensureDataDirs() {
  for (const d of [config.dataDir, config.outboxDir, config.logsDir, config.workspaceDir]) {
    mkdirSync(d, { recursive: true });
  }
}