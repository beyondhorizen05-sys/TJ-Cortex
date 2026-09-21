import cron from 'node-cron';
import { broadcast } from './ws.js';
import { WS_EVENTS } from '@tj-cortex/shared';
import { config } from './config.js';
import { logger } from './logger.js';
import { consolidate } from './memory.js';
import { db } from './db/client.js';
import { agents } from './db/schema.js';

/**
 * Night Shift — the autonomy window during which agents continue working and
 * trading within the boundaries set by the user. Default 22:00 to 06:00
 * local time. Boundaries are enforced by the permission engine and the
 * economy engine (Turn 6); Night Shift only decides *when* autonomy is
 * permitted.
 */

let nightActive = false;
let startTask: cron.ScheduledTask | null = null;
let endTask: cron.ScheduledTask | null = null;

function toCron(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${m} ${h} * * *`;
}

export function isNightShiftActive(): boolean {
  return nightActive;
}

export function startNightShift() {
  if (!config.nightShift.enabled) {
    logger.info('night shift disabled');
    return;
  }
  startTask = cron.schedule(toCron(config.nightShift.start), () => {
    nightActive = true;
    logger.info('night shift started');
    broadcast(WS_EVENTS.NightShiftStart, { at: Date.now() });
    // Memory consolidation for all agents.
    for (const a of db.select().from(agents).all()) {
      try {
        consolidate(a.id);
      } catch (e) {
        logger.warn({ agent: a.id, err: (e as Error).message }, 'consolidate failed');
      }
    }
  });
  endTask = cron.schedule(toCron(config.nightShift.end), () => {
    nightActive = false;
    logger.info('night shift ended');
    broadcast(WS_EVENTS.NightShiftEnd, { at: Date.now() });
  });
}

export function stopNightShift() {
  startTask?.stop();
  endTask?.stop();
  startTask = null;
  endTask = null;
}