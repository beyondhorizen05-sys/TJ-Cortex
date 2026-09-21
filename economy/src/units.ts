import { CC_PER_USD } from '@tj-cortex/shared';

/**
 * Cortex Credits (CC). 1 CC is displayed as 1 USD for readability — a
 * deliberate choice documented in ASSUMPTIONS.md. This module is the single
 * place where the peg and rounding live, so any future change (e.g. moving to
 * micro-CC integer math) happens in one file.
 */

export function ccFromUsd(usd: number): number {
  return roundCC(usd * CC_PER_USD);
}

export function usdFromCC(cc: number): number {
  return roundCC(cc / CC_PER_USD);
}

/** CC has two decimal places. All arithmetic must flow through this. */
export function roundCC(cc: number): number {
  return Math.round(cc * 100) / 100;
}

export function assertNonNegativeAmount(cc: number, label = 'amount'): void {
  if (!Number.isFinite(cc) || cc < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

export function formatCC(cc: number): string {
  return `${cc.toFixed(2)} CC`;
}