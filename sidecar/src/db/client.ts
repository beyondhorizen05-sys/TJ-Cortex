import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config, ensureDataDirs } from '../config.js';
import { schema } from './schema.js';
import { runMigrations } from './migrations.js';
import { logger } from '../logger.js';

ensureDataDirs();

const sqlite = new Database(config.dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

runMigrations(sqlite);

export const db = drizzle(sqlite, { schema });
export const raw = sqlite;

logger.info({ dbPath: config.dbPath }, 'Cortex database open');