import { registerTool } from './registry.js';

/**
 * Outbound HTTP tool. URLs are checked against a small deny-list (localhost
 * and RFC1918 are allowed only when the user has granted `http.outbound`
 * for that host). By default this tool requires consent.
 */
const DEFAULT_TIMEOUT = 20_000;

registerTool({
  descriptor: {
    name: 'http.request',
    category: 'http',
    description: 'Perform an outbound HTTP request (GET/POST/etc.). Requires consent.',
    risk: 'external',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        method: { type: 'string', default: 'GET' },
        headers: { type: 'object' },
        body: { type: 'string' },
        timeoutMs: { type: 'number' },
      },
      required: ['url'],
    },
    requiresConsent: true,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const url = String(inv.args.url ?? '');
    const method = String(inv.args.method ?? 'GET').toUpperCase();
    const headers = (inv.args.headers as Record<string, string>) ?? {};
    const body = inv.args.body ? String(inv.args.body) : undefined;
    const timeoutMs = Number(inv.args.timeoutMs ?? DEFAULT_TIMEOUT);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, headers, body, signal: ctrl.signal });
      const text = await res.text();
      return {
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        text: text.slice(0, 200_000),
        truncated: text.length > 200_000,
      };
    } finally {
      clearTimeout(t);
    }
  },
});