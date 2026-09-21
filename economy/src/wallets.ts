import { randomUUID } from 'node:crypto';
import type { Wallet } from '@tj-cortex/shared';
import { roundCC } from './units.js';
import type { EconomyStore } from './types.js';
import { append } from './ledger.js';

/**
 * Wallet operations. There are three kinds of wallets:
 *   - agent wallets (one per agent)
 *   - escrow wallets (created per contract/bounty)
 *   - the system treasury (a single wallet used for mint)
 *
 * The treasury is the only wallet allowed to mint. Any mint must be explicit,
 * with a memo, and it appears in the ledger like everything else.
 */

export const TREASURY_LABEL = 'Myelin Bank Treasury';

export function ensureTreasury(store: EconomyStore): Wallet {
  let w = store.listWallets().find((x) => x.label === TREASURY_LABEL);
  if (w) return w;
  w = {
    id: randomUUID(),
    label: TREASURY_LABEL,
    balanceCC: 0,
    escrowCC: 0,
    createdAt: Date.now(),
  };
  store.insertWallet(w);
  return w;
}

export function ensureAgentWallet(store: EconomyStore, agentId: string, label: string): Wallet {
  let w = store.getWalletByAgent(agentId);
  if (w) return w;
  w = {
    id: randomUUID(),
    agentId,
    label,
    balanceCC: 0,
    escrowCC: 0,
    createdAt: Date.now(),
  };
  store.insertWallet(w);
  return w;
}

export function createEscrowWallet(store: EconomyStore, label: string): Wallet {
  const w: Wallet = {
    id: randomUUID(),
    label,
    balanceCC: 0,
    escrowCC: 0,
    createdAt: Date.now(),
  };
  store.insertWallet(w);
  return w;
}

/**
 * Mint new CC into a wallet. Only the treasury is allowed to originate mint
 * entries; the treasury balance then moves to the target wallet in a single
 * ledger entry to keep the chain readable.
 */
export function mint(
  store: EconomyStore,
  secret: string,
  toWalletId: string,
  amountCC: number,
  memo: string,
): Wallet {
  const amount = roundCC(amountCC);
  if (amount <= 0) throw new Error('mint amount must be positive');
  const to = store.getWallet(toWalletId);
  if (!to) throw new Error(`wallet not found: ${toWalletId}`);

  const next: Wallet = { ...to, balanceCC: roundCC(to.balanceCC + amount) };
  store.updateWallet(next);

  append(store, secret, {
    kind: 'mint',
    amountCC: amount,
    toWalletId,
    memo,
  });

  return next;
}

/** Transfer between two wallets with a single ledger entry. */
export function transfer(
  store: EconomyStore,
  secret: string,
  fromWalletId: string,
  toWalletId: string,
  amountCC: number,
  memo?: string,
  refId?: string,
): { from: Wallet; to: Wallet } {
  const amount = roundCC(amountCC);
  if (amount <= 0) throw new Error('transfer amount must be positive');
  const from = store.getWallet(fromWalletId);
  const to = store.getWallet(toWalletId);
  if (!from) throw new Error(`wallet not found: ${fromWalletId}`);
  if (!to) throw new Error(`wallet not found: ${toWalletId}`);
  if (from.balanceCC < amount) throw new Error('insufficient balance');

  const nextFrom: Wallet = { ...from, balanceCC: roundCC(from.balanceCC - amount) };
  const nextTo: Wallet = { ...to, balanceCC: roundCC(to.balanceCC + amount) };
  store.updateWallet(nextFrom);
  store.updateWallet(nextTo);

  append(store, secret, {
    kind: 'transfer',
    amountCC: amount,
    fromWalletId,
    toWalletId,
    memo,
    refId,
  });

  return { from: nextFrom, to: nextTo };
}

/**
 * Move CC from a wallet into an escrow wallet. Escrow CC is held aside and is
 * only released by the contract/bounty engine.
 */
export function moveToEscrow(
  store: EconomyStore,
  secret: string,
  fromWalletId: string,
  escrowWalletId: string,
  amountCC: number,
  refId: string,
  memo: string,
): void {
  const amount = roundCC(amountCC);
  const from = store.getWallet(fromWalletId);
  const escrow = store.getWallet(escrowWalletId);
  if (!from || !escrow) throw new Error('wallet or escrow not found');
  if (from.balanceCC < amount) throw new Error('insufficient balance for escrow');

  const nextFrom: Wallet = { ...from, balanceCC: roundCC(from.balanceCC - amount) };
  const nextEscrow: Wallet = { ...escrow, escrowCC: roundCC(escrow.escrowCC + amount) };
  store.updateWallet(nextFrom);
  store.updateWallet(nextEscrow);

  append(store, secret, {
    kind: 'contract_escrow',
    amountCC: amount,
    fromWalletId,
    toWalletId: escrowWalletId,
    refId,
    memo,
  });
}

/** Release escrow into a recipient wallet, marking payout. */
export function releaseEscrow(
  store: EconomyStore,
  secret: string,
  escrowWalletId: string,
  recipientWalletId: string,
  amountCC: number,
  refId: string,
  memo: string,
): void {
  const amount = roundCC(amountCC);
  const escrow = store.getWallet(escrowWalletId);
  const rec = store.getWallet(recipientWalletId);
  if (!escrow || !rec) throw new Error('escrow or recipient not found');
  if (escrow.escrowCC < amount) throw new Error('escrow underfunded');

  const nextEscrow: Wallet = { ...escrow, escrowCC: roundCC(escrow.escrowCC - amount) };
  const nextRec: Wallet = { ...rec, balanceCC: roundCC(rec.balanceCC + amount) };
  store.updateWallet(nextEscrow);
  store.updateWallet(nextRec);

  append(store, secret, {
    kind: 'contract_payout',
    amountCC: amount,
    fromWalletId: escrowWalletId,
    toWalletId: recipientWalletId,
    refId,
    memo,
  });
}

/** Refund escrow back to a wallet (contract cancelled or disputed in favor). */
export function refundEscrow(
  store: EconomyStore,
  secret: string,
  escrowWalletId: string,
  recipientWalletId: string,
  amountCC: number,
  refId: string,
  memo: string,
): void {
  const amount = roundCC(amountCC);
  const escrow = store.getWallet(escrowWalletId);
  const rec = store.getWallet(recipientWalletId);
  if (!escrow || !rec) throw new Error('escrow or recipient not found');
  if (escrow.escrowCC < amount) throw new Error('escrow underfunded');

  const nextEscrow: Wallet = { ...escrow, escrowCC: roundCC(escrow.escrowCC - amount) };
  const nextRec: Wallet = { ...rec, balanceCC: roundCC(rec.balanceCC + amount) };
  store.updateWallet(nextEscrow);
  store.updateWallet(nextRec);

  append(store, secret, {
    kind: 'contract_refund',
    amountCC: amount,
    fromWalletId: escrowWalletId,
    toWalletId: recipientWalletId,
    refId,
    memo,
  });
}