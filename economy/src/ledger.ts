import { randomUUID } from 'node:crypto';
import type { LedgerEntry, LedgerEntryKind } from '@tj-cortex/shared';
import { roundCC } from './units.js';
import { hashEntry, signHash, verifySignature, chainDigest } from './signer.js';
import type { EconomyStore } from './types.js';

/**
 * The Cortex Ledger. Every entry is:
 *   - id, ts, kind, amountCC
 *   - fromWalletId, toWalletId, agentId, refId, memo (optional)
 *   - prevHash, hash, signature
 *
 * Append-only. Two invariants enforced here:
 *   1. `prevHash` equals the previous entry's `hash` (or "genesis").
 *   2. `amountCC` is non-zero and finite.
 *
 * Reads and writes go through the EconomyStore port.
 */

export const GENESIS_HASH = 'genesis';

export interface AppendEntryInput {
  kind: LedgerEntryKind;
  amountCC: number;
  fromWalletId?: string;
  toWalletId?: string;
  agentId?: string;
  refId?: string;
  memo?: string;
}

export function append(
  store: EconomyStore,
  secret: string,
  input: AppendEntryInput,
): LedgerEntry {
  const amount = roundCC(input.amountCC);
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Ledger amount must be a finite non-zero number');
  }

  const prev = store.lastLedgerEntry();
  const prevHash = prev?.hash ?? GENESIS_HASH;

  const ts = Date.now();
  const id = randomUUID();

  const payloadWithoutHashes = {
    id,
    ts,
    kind: input.kind,
    amountCC: amount,
    fromWalletId: input.fromWalletId ?? null,
    toWalletId: input.toWalletId ?? null,
    agentId: input.agentId ?? null,
    refId: input.refId ?? null,
    memo: input.memo ?? null,
  };

  const hash = hashEntry(payloadWithoutHashes, prevHash);
  const signature = signHash(hash, secret);

  const entry: LedgerEntry = {
    id,
    ts,
    kind: input.kind,
    amountCC: amount,
    fromWalletId: input.fromWalletId,
    toWalletId: input.toWalletId,
    agentId: input.agentId,
    refId: input.refId,
    memo: input.memo,
    prevHash,
    hash,
    signature,
  };

  store.insertLedgerEntry(entry);
  return entry;
}

/**
 * Audit: walk the whole chain, re-deriving each hash and verifying each
 * signature. Returns the first index where the chain diverges, or null.
 */
export function audit(
  store: EconomyStore,
  secret: string,
): { ok: true; entries: number; digest: string } | { ok: false; brokenAtId: string; reason: string } {
  const entries = store.listLedger(1_000_000).slice().reverse(); // oldest first
  let prevHash = GENESIS_HASH;
  const hashes: string[] = [];
  for (const e of entries) {
    if (e.prevHash !== prevHash) {
      return { ok: false, brokenAtId: e.id, reason: 'prevHash mismatch' };
    }
    const payloadWithoutHashes = {
      id: e.id,
      ts: e.ts,
      kind: e.kind,
      amountCC: e.amountCC,
      fromWalletId: e.fromWalletId ?? null,
      toWalletId: e.toWalletId ?? null,
      agentId: e.agentId ?? null,
      refId: e.refId ?? null,
      memo: e.memo ?? null,
    };
    const recomputed = hashEntry(payloadWithoutHashes, prevHash);
    if (recomputed !== e.hash) {
      return { ok: false, brokenAtId: e.id, reason: 'hash mismatch' };
    }
    if (!verifySignature(e.hash, e.signature, secret)) {
      return { ok: false, brokenAtId: e.id, reason: 'signature invalid' };
    }
    prevHash = e.hash;
    hashes.push(e.hash);
  }
  return { ok: true, entries: entries.length, digest: chainDigest(hashes) };
}