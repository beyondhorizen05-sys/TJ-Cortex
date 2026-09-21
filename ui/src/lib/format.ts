import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function fmtCC(cc: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && cc > 0 ? '+' : '';
  return `${sign}${cc.toFixed(2)} CC`;
}

export function fmtUSD(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function fmtNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function fmtAgo(ts: number): string {
  const d = Date.now() - ts;
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  return `${dd}d ago`;
}

export function stateColor(state: string): string {
  switch (state) {
    case 'working': return '#F59E0B';
    case 'idle': return '#34D399';
    case 'meeting': return '#3B82F6';
    case 'blocked': return '#FB7185';
    case 'sleeping': return '#64748B';
    case 'trading': return '#14B8A6';
    case 'earning': return '#F59E0B';
    default: return '#64748B';
  }
}