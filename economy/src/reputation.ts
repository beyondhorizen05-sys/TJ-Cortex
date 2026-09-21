import type { Reputation } from '@tj-cortex/shared';
import { roundCC } from './units.js';
import type { EconomyStore, EconomyEmit } from './types.js';

/**
 * Cortex Reputation. A rolling 0–100 score plus raw counters. Recomputed
 * deterministically from public counters so any observer can verify it.
 */

export function ensure(store: EconomyStore, agentId: string): Reputation {
  let r = store.getReputation(agentId);
  if (r) return r;
  r = {
    agentId,
    score: 0,
    contractsCompleted: 0,
    contractsDisputed: 0,
    totalEarnedCC: 0,
    totalSpentCC: 0,
    updatedAt: Date.now(),
  };
  store.upsertReputation(r);
  return r;
}

export function recordDispute(
  store: EconomyStore,
  emit: EconomyEmit,
  agentId: string,
): Reputation {
  const r = ensure(store, agentId);
  const next: Reputation = {
    ...r,
    score: Math.max(0, r.score - 5),
    contractsDisputed: r.contractsDisputed + 1,
    updatedAt: Date.now(),
  };
  store.upsertReputation(next);
  emit({ type: 'reputation.updated', payload: next });
  return next;
}

export function recordEarned(
  store: EconomyStore,
  emit: EconomyEmit,
  agentId: string,
  amountCC: number,
): Reputation {
  const r = ensure(store, agentId);
  const next: Reputation = {
    ...r,
    totalEarnedCC: roundCC(r.totalEarnedCC + amountCC),
    updatedAt: Date.now(),
  };
  store.upsertReputation(next);
  emit({ type: 'reputation.updated', payload: next });
  return next;
}

export function recordSpent(
  store: EconomyStore,
  emit: EconomyEmit,
  agentId: string,
  amountCC: number,
): Reputation {
  const r = ensure(store, agentId);
  const next: Reputation = {
    ...r,
    totalSpentCC: roundCC(r.totalSpentCC + amountCC),
    updatedAt: Date.now(),
  };
  store.upsertReputation(next);
  emit({ type: 'reputation.updated', payload: next });
  return next;
}