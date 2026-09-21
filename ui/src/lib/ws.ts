import { WS_EVENTS, SIDECAR_DEFAULT_HOST, SIDECAR_DEFAULT_PORT, type WsEnvelope } from '@tj-cortex/shared';

type Handler = (payload: any, envelope: WsEnvelope) => void;
const handlers = new Map<string, Set<Handler>>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 500;
const statusListeners = new Set<(connected: boolean) => void>();

function url(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const host = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? location.hostname
    : SIDECAR_DEFAULT_HOST;
  return proto + '://' + host + ':' + SIDECAR_DEFAULT_PORT + '/ws';
}

export function startWs() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws = new WebSocket(url());

  ws.addEventListener('open', () => {
    reconnectDelay = 500;
    emitStatus(true);
  });

  ws.addEventListener('close', () => {
    emitStatus(false);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      startWs();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 8000);
  });

  ws.addEventListener('error', () => { try { ws?.close(); } catch {} });

  ws.addEventListener('message', (ev) => {
    try {
      const env = JSON.parse(ev.data) as WsEnvelope;
      const set = handlers.get(env.event);
      if (!set) return;
      for (const h of set) h(env.payload, env);
    } catch {
      /* ignore malformed frames */
    }
  });
}

export function on(event: string, handler: Handler): () => void {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler);
  return () => handlers.get(event)?.delete(handler);
}

export function onStatus(h: (connected: boolean) => void): () => void {
  statusListeners.add(h);
  return () => statusListeners.delete(h);
}

function emitStatus(c: boolean) {
  for (const h of statusListeners) h(c);
}

export const WS = WS_EVENTS;