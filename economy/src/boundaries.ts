import { ECON_DEFAULTS } from '@tj-cortex/shared';
import type { Agent } from '@tj-cortex/shared';
import type { EconomyStore, SpendRequest } from './types.js';

/**
 * Autonomy boundaries. Every spend must pass through `check()`. The check is
 * pure — it reads the store for the agent's rolling daily spend and the agent's
 * boundaries from the caller (usually the sidecar).
 *
 * Defaults (from ECON_DEFAULTS):
 *   - perAgentPerDayCC      = 100
 *   - perContractCC         = 25
 *   - allowExternalTransfers= false
 *   - requireConsentAboveCC = 10
 */

export interface BoundaryDecision {
  allowed: boolean;
  requiresConsent: boolean;
  reason?: string;
  dailySpendCC: number;
  remainingTodayCC: number;
}

export function check(
  store: EconomyStore,
  agent: Pick<Agent, 'id' | 'boundaries'>,
  req: SpendRequest,
  consentGranted: boolean,
): BoundaryDecision {
  const b = { ...ECON_DEFAULTS, ...(agent.boundaries ?? {}) };

  if (!Number.isFinite(req.amountCC) || req.amountCC < 0) {
    return {
      allowed: false,
      requiresConsent: false,
      reason: 'invalid amount',
      dailySpendCC: 0,
      remainingTodayCC: 0,
    };
  }

  if (req.kind === 'external_transfer' && !b.allowExternalTransfers) {
    return {
      allowed: false,
      requiresConsent: true,
      reason: 'external transfers are disabled for this agent',
      dailySpendCC: 0,
      remainingTodayCC: 0,
    };
  }

  if (req.kind === 'contract_escrow' || req.kind === 'bounty_escrow') {
    if (req.amountCC > b.perContractCC) {
      return {
        allowed: false,
        requiresConsent: true,
        reason: `amount exceeds per-contract cap of ${b.perContractCC} CC`,
        dailySpendCC: 0,
        remainingTodayCC: 0,
      };
    }
  }

  const since = startOfLocalDay();
  const dailySpendCC = store.sumSpendForAgentSince(agent.id, since);
  const remainingTodayCC = Math.max(0, b.perAgentPerDayCC - dailySpendCC);

  if (req.amountCC > remainingTodayCC) {
    return {
      allowed: false,
      requiresConsent: true,
      reason: `amount exceeds remaining daily budget of ${remainingTodayCC.toFixed(2)} CC`,
      dailySpendCC,
      remainingTodayCC,
    };
  }

  const requiresConsent = req.amountCC > b.requireConsentAboveCC;
  if (requiresConsent && !consentGranted) {
    return {
      allowed: false,
      requiresConsent: true,
      reason: `amount above ${b.requireConsentAboveCC} CC requires explicit consent`,
      dailySpendCC,
      remainingTodayCC,
    };
  }

  return { allowed: true, requiresConsent, dailySpendCC, remainingTodayCC };
}

export function startOfLocalDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}