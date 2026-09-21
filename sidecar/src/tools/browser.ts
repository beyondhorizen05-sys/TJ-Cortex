import { registerTool } from './registry.js';

/**
 * Browser tool. v1 has two modes:
 *   - `fetch`  : simple HTTP GET returning text (used when JS is not needed)
 *   - `render` : delegated to the UI (Tauri webview) via a WS round-trip —
 *                the sidecar emits a request and waits for the result.
 *
 * The `render` mode is intentionally a stub in v1: it broadcasts a request
 * event and returns a placeholder with a note. The UI will implement it in
 * Turn 4. The contract is stable so nothing breaks.
 */
registerTool({
  descriptor: {
    name: 'browser.navigate',
    category: 'browser',
    description: 'Fetch or render a URL. Requires consent for the target host.',
    risk: 'external',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        mode: { type: 'string', enum: ['fetch', 'render'] },
      },
      required: ['url'],
    },
    requiresConsent: true,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const url = String(inv.args.url ?? '');
    const mode = String(inv.args.mode ?? 'fetch');
    if (mode === 'fetch') {
      const res = await fetch(url);
      const text = await res.text();
      return { status: res.status, text: text.slice(0, 200_000) };
    }
    return { rendered: false, note: 'Render mode is handled by the UI in TJ-Cortex v0.2.' };
  },
});