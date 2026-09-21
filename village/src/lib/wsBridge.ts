/**
 * Small indirection so the village package can subscribe to the same
 * WebSocket the UI already owns without hard-depending on the ui package.
 * The UI installs the bridge at startup.
 */

type Handler = (payload: any, env: any) => void;
let impl: { on: (event: string, h: Handler) => () => void } | null = null;

export function installWsBridge(bridge: { on: (event: string, h: Handler) => () => void }) {
  impl = bridge;
}

export function on(event: string, h: Handler): () => void {
  if (!impl) return () => {};
  return impl.on(event, h);
}