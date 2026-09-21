import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Ledger signing.
 *
 * Every ledger entry is:
 *   1. Serialized to a canonical JSON string (sorted keys).
 *   2. Hashed with SHA-256 and chained to the previous entry's hash.
 *   3. Signed with HMAC-SHA-256 using a machine-local secret stored in the
 *      OS keychain (or, for tests and first run, a per-install random secret).
 *
 * This is not a blockchain. It is an append-only audit log with tamper
 * detection: any attempt to modify a past entry breaks the hash of every
 * subsequent entry, and any attempt to forge an entry fails HMAC verification
 * without the local secret.
 */

export interface SignedPayload {
  prevHash: string;
  hash: string;
  signature: string;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeys(value[k]);
    return out;
  }
  return value;
}

export function hashEntry(payloadWithoutHashes: Record<string, unknown>, prevHash: string): string {
  const h = createHash('sha256');
  h.update(prevHash);
  h.update('\n');
  h.update(canonicalJson(payloadWithoutHashes));
  return h.digest('hex');
}

export function signHash(hash: string, secret: string): string {
  return createHmac('sha256', secret).update(hash).digest('hex');
}

export function verifySignature(hash: string, signature: string, secret: string): boolean {
  const expected = signHash(hash, secret);
  // constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export function newLocalSecret(): string {
  return randomBytes(32).toString('hex');
}

/** Deterministic signature for a whole chain — used for audit exports. */
export function chainDigest(hashes: string[]): string {
  const h = createHash('sha256');
  for (const x of hashes) {
    h.update(x);
    h.update('\n');
  }
  return h.digest('hex');
}