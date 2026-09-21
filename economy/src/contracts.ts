import { randomUUID } from 'node:crypto';
import type { Contract, ContractStatus } from '@tj-cortex/shared';
import { roundCC } from './units.js';
import type { EconomyStore, EconomyEmit } from './types.js';
import { createEscrowWallet, moveToEscrow, releaseEscrow, refundEscrow } from './wallets.js';
import { check } from './boundaries.js';
import type { Agent } from '@tj-cortex/shared';

/**
 * Cortex Contracts.
 *
 * Lifecycle: draft → proposed → accepted → in_progress → delivered → settled
 *                     ↓            ↓             ↓
 *                  cancelled    disputed     cancelled
 *
 * Escrow: the client's wallet is debited into a per-contract escrow wallet at
 * `accepted`. On `settled`, escrow pays out to the worker. On `cancelled` or
 * `disputed` in favor of the client, escrow refunds to the client.
 *
 * The engine never assumes a contract is real; every state transition is
 * persisted and every settlement writes a signed ledger entry.
 */

export interface ProposeInput {
  title: string;
  brief: string;
  clientAgentId: string;
  amountCC: number;
  deliverables?: string[];
}

export interface AcceptInput {
  contractId: string;
  workerAgentId: string;
  clientAgent: Pick<Agent, 'id' | 'boundaries'>;
  consentGranted?: boolean;
}

export function propose(
  store: EconomyStore,
  emit: EconomyEmit,
  input: ProposeInput,
): Contract {
  const amount = roundCC(input.amountCC);
  if (amount <= 0) throw new Error('contract amount must be positive');
  const now = Date.now();
  const c: Contract = {
    id: randomUUID(),
    title: input.title,
    brief: input.brief,
    clientAgentId: input.clientAgentId,
    amountCC: amount,
    status: 'proposed',
    deliverables: input.deliverables ?? [],
    createdAt: now,
    updatedAt: now,
    negotiationLog: [
      { ts: now, from: input.clientAgentId, text: `Proposed contract for ${amount.toFixed(2)} CC.` },
    ],
  };
  store.insertContract(c);
  emit({ type: 'contract.proposed', payload: c });
  return c;
}

export function accept(
  store: EconomyStore,
  emit: EconomyEmit,
  secret: string,
  input: AcceptInput,
): Contract {
  const c = store.getContract(input.contractId);
  if (!c) throw new Error(`contract not found: ${input.contractId}`);
  if (c.status !== 'proposed' && c.status !== 'draft') {
    throw new Error(`cannot accept contract in status ${c.status}`);
  }

  // Boundaries check on the client's side (the spender).
  const decision = check(
    store,
    input.clientAgent,
    {
      agentId: input.clientAgent.id,
      amountCC: c.amountCC,
      kind: 'contract_escrow',
      refId: c.id,
      reason: `Contract: ${c.title}`,
    },
    input.consentGranted ?? false,
  );
  if (!decision.allowed) {
    throw new Error(`contract blocked by boundaries: ${decision.reason}`);
  }

  // Create escrow, fund it, and flip the contract to accepted.
  const escrow = createEscrowWallet(store, `Escrow · ${c.title}`);
  const clientWallet = store.getWalletByAgent(input.clientAgent.id);
  if (!clientWallet) throw new Error('client wallet not found');

  moveToEscrow(store, secret, clientWallet.id, escrow.id, c.amountCC, c.id, `Escrow for ${c.title}`);

  const now = Date.now();
  const next: Contract = {
    ...c,
    workerAgentId: input.workerAgentId,
    escrowWalletId: escrow.id,
    status: 'accepted',
    updatedAt: now,
    negotiationLog: [
      ...c.negotiationLog,
      { ts: now, from: input.workerAgentId, text: `Accepted. Escrow funded with ${c.amountCC.toFixed(2)} CC.` },
    ],
  };
  store.updateContract(next);
  emit({ type: 'contract.signed', payload: next });
  return next;
}

export function start(
  store: EconomyStore,
  emit: EconomyEmit,
  contractId: string,
): Contract {
  const c = store.getContract(contractId);
  if (!c || c.status !== 'accepted') throw new Error('invalid contract state for start');
  const next: Contract = { ...c, status: 'in_progress', updatedAt: Date.now() };
  store.updateContract(next);
  emit({ type: 'contract.signed', payload: next });
  return next;
}

export function deliver(
  store: EconomyStore,
  emit: EconomyEmit,
  contractId: string,
  note?: string,
): Contract {
  const c = store.getContract(contractId);
  if (!c || c.status !== 'in_progress') throw new Error('invalid contract state for deliver');
  const now = Date.now();
  const next: Contract = {
    ...c,
    status: 'delivered',
    updatedAt: now,
    negotiationLog: [
      ...c.negotiationLog,
      { ts: now, from: c.workerAgentId ?? c.clientAgentId, text: note ?? 'Delivered.' },
    ],
  };
  store.updateContract(next);
  emit({ type: 'contract.signed', payload: next });
  return next;
}

export function settle(
  store: EconomyStore,
  emit: EconomyEmit,
  secret: string,
  contractId: string,
): Contract {
  const c = store.getContract(contractId);
  if (!c || !c.escrowWalletId || !c.workerAgentId) throw new Error('contract not settleable');
  if (c.status !== 'delivered' && c.status !== 'in_progress') {
    throw new Error(`cannot settle in status ${c.status}`);
  }
  const workerWallet = store.getWalletByAgent(c.workerAgentId);
  if (!workerWallet) throw new Error('worker wallet not found');

  releaseEscrow(store, secret, c.escrowWalletId, workerWallet.id, c.amountCC, c.id, `Payout for ${c.title}`);

  const now = Date.now();
  const next: Contract = { ...c, status: 'settled', settledAt: now, updatedAt: now };
  store.updateContract(next);
  emit({ type: 'contract.settled', payload: next });

  // Reputation bump for the worker; small drop if disputed never happened.
  const rep = store.getReputation(c.workerAgentId);
  if (rep) {
    store.upsertReputation({
      ...rep,
      score: Math.min(100, rep.score + 2),
      contractsCompleted: rep.contractsCompleted + 1,
      totalEarnedCC: roundCC(rep.totalEarnedCC + c.amountCC),
      updatedAt: now,
    });
  }
  return next;
}

export function cancel(
  store: EconomyStore,
  emit: EconomyEmit,
  secret: string,
  contractId: string,
  reason: string,
): Contract {
  const c = store.getContract(contractId);
  if (!c) throw new Error('contract not found');
  if (c.status === 'settled') throw new Error('cannot cancel a settled contract');

  // Refund any escrow.
  if (c.escrowWalletId) {
    const escrow = store.getWallet(c.escrowWalletId);
    const clientWallet = store.getWalletByAgent(c.clientAgentId);
    if (escrow && clientWallet && escrow.escrowCC > 0) {
      refundEscrow(store, secret, escrow.id, clientWallet.id, escrow.escrowCC, c.id, `Refund for ${c.title}: ${reason}`);
    }
  }

  const now = Date.now();
  const next: Contract = {
    ...c,
    status: 'cancelled',
    updatedAt: now,
    negotiationLog: [...c.negotiationLog, { ts: now, from: c.clientAgentId, text: `Cancelled: ${reason}` }],
  };
  store.updateContract(next);
  emit({ type: 'contract.settled', payload: next });
  return next;
}

/** Append a negotiation log line. */
export function logNegotiation(
  store: EconomyStore,
  emit: EconomyEmit,
  contractId: string,
  fromAgentId: string,
  text: string,
): Contract {
  const c = store.getContract(contractId);
  if (!c) throw new Error('contract not found');
  const next: Contract = {
    ...c,
    updatedAt: Date.now(),
    negotiationLog: [...c.negotiationLog, { ts: Date.now(), from: fromAgentId, text }],
  };
  store.updateContract(next);
  emit({ type: 'contract.proposed', payload: next });
  return next;
}

export function setStatus(
  store: EconomyStore,
  emit: EconomyEmit,
  contractId: string,
  status: ContractStatus,
): Contract {
  const c = store.getContract(contractId);
  if (!c) throw new Error('contract not found');
  const next: Contract = { ...c, status, updatedAt: Date.now() };
  store.updateContract(next);
  emit({ type: 'contract.signed', payload: next });
  return next;
}