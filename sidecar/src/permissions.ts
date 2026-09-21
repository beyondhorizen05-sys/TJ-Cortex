import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { PermissionKind, PermissionRequest, PermissionDecision } from '@tj-cortex/shared';
import { db } from './db/client.js';
import { permissionPolicies, permissionRequests } from './db/schema.js';
import { broadcast } from './ws.js';
import { WS_EVENTS } from '@tj-cortex/shared';
import { logger } from './logger.js';

/**
 * Permission engine.
 *
 * Flow:
 *   - request(kind, scope, agentId, reason, risk)
 *   - If a matching `allow_always` policy exists and hasn't expired -> auto-allow.
 *   - Else insert a pending request and broadcast `permission.requested`.
 *   - UI calls resolve() with a decision; if `allow_always` we persist a policy.
 *
 * Nothing else in the sidecar may perform a risky action without going
 * through this engine. It is the single choke point.
 */

export interface RequestOptions {
  agentId: string;
  kind: PermissionKind;
  scope: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  /** Auto-deny timeout. Defaults to 5 minutes. */
  timeoutMs?: number;
}

export interface ResolveOptions {
  id: string;
  decision: PermissionDecision;
  note?: string;
}

type Waiter = (allowed: boolean) => void;
const waiters = new Map<string, Waiter>();

export async function requestPermission(opts: RequestOptions): Promise<PermissionRequest> {
  const now = Date.now();

  // Existing policy?
  const existing = db
    .select()
    .from(permissionPolicies)
    .where(and(eq(permissionPolicies.kind, opts.kind), eq(permissionPolicies.scope, opts.scope)))
    .all()[0];

  if (existing) {
    if (!existing.expiresAt || existing.expiresAt > now) {
      if (existing.decision === 'allow_always') {
        logger.debug({ kind: opts.kind, scope: opts.scope }, 'permission auto-allowed');
        return {
          id: randomUUID(),
          agentId: opts.agentId,
          kind: opts.kind,
          scope: opts.scope,
          reason: 'Auto-allowed by policy.',
          risk: opts.risk,
          createdAt: now,
        };
      }
    }
  }

  const id = randomUUID();
  const record: PermissionRequest = {
    id,
    agentId: opts.agentId,
    kind: opts.kind,
    scope: opts.scope,
    reason: opts.reason,
    risk: opts.risk,
    createdAt: now,
    expiresAt: now + (opts.timeoutMs ?? 5 * 60_000),
  };

  db.insert(permissionRequests)
    .values({
      id: record.id,
      agentId: record.agentId,
      kind: record.kind,
      scope: record.scope,
      reason: record.reason,
      risk: record.risk,
      status: 'pending',
      createdAt: record.createdAt,
    })
    .run();

  broadcast(WS_EVENTS.PermissionRequested, record);
  logger.info({ id, kind: opts.kind, agentId: opts.agentId }, 'permission requested');

  return record;
}

export function waitForDecision(id: string, timeoutMs = 5 * 60_000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const t = setTimeout(() => {
      waiters.delete(id);
      resolve(false);
    }, timeoutMs);
    waiters.set(id, (allowed) => {
      clearTimeout(t);
      waiters.delete(id);
      resolve(allowed);
    });
  });
}

export async function resolvePermission(opts: ResolveOptions): Promise<void> {
  const now = Date.now();

  const req = db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.id, opts.id))
    .all()[0];
  if (!req) throw new Error(`permission request not found: ${opts.id}`);

  db.update(permissionRequests)
    .set({ status: 'resolved', decision: opts.decision, resolvedAt: now })
    .where(eq(permissionRequests.id, opts.id))
    .run();

  if (opts.decision === 'allow_always') {
    db.insert(permissionPolicies)
      .values({
        id: randomUUID(),
        kind: req.kind,
        scope: req.scope,
        decision: 'allow_always',
        grantedAt: now,
      })
      .onConflictDoUpdate({
        target: [permissionPolicies.kind, permissionPolicies.scope],
        set: { decision: 'allow_always', grantedAt: now, expiresAt: null },
      })
      .run();
  }

  const allowed = opts.decision !== 'deny';
  waiters.get(opts.id)?.(allowed);
  broadcast(WS_EVENTS.PermissionResolved, {
    id: opts.id,
    decision: opts.decision,
    resolvedAt: now,
    resolvedBy: 'user',
    note: opts.note,
  });
  logger.info({ id: opts.id, decision: opts.decision }, 'permission resolved');
}

export function listPolicies() {
  return db.select().from(permissionPolicies).all();
}

export function deletePolicy(id: string) {
  db.delete(permissionPolicies).where(eq(permissionPolicies.id, id)).run();
}

/**
 * High-level helper: request and wait for a decision in one call.
 */
export async function ask(
  opts: RequestOptions & { timeoutMs?: number },
): Promise<boolean> {
  const rec = await requestPermission(opts);
  // If it was auto-allowed, the record won't be pending.
  const row = db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.id, rec.id))
    .all()[0];
  if (row && row.status === 'resolved') {
    return row.decision !== 'deny';
  }
  return waitForDecision(rec.id, opts.timeoutMs);
}