import type { WebSocket } from '@fastify/websocket';
import type { WsEventName, WsEnvelope } from '@tj-cortex/shared';
import { logger } from './logger.js';

/**
 * WebSocket hub. Every backend event that the UI or village cares about
 * flows through here. Messages are envelopes: { event, ts, payload }.
 */

const clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  logger.debug({ count: clients.size }, 'ws client connected');
  ws.send(
    JSON.stringify({
      event: 'hello',
      ts: Date.now(),
      payload: { server: 'tj-cortex-sidecar', version: '0.1.0' },
    }),
  );

  ws.on('close', () => {
    clients.delete(ws);
    logger.debug({ count: clients.size }, 'ws client disconnected');
  });
  ws.on('error', (err) => {
    logger.warn({ err: err.message }, 'ws client error');
    clients.delete(ws);
  });
}

export function broadcast<T>(event: WsEventName, payload: T): void {
  const msg: WsEnvelope<T> = { event, ts: Date.now(), payload };
  const text = JSON.stringify(msg);
  for (const ws of clients) {
    try {
      if (ws.readyState === 1) ws.send(text);
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'ws broadcast failed');
    }
  }
}

export function clientCount(): number {
  return clients.size;
}