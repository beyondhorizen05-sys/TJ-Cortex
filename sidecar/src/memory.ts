import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Memory, MemoryKind, MemoryQuery } from '@tj-cortex/shared';
import { db } from './db/client.js';
import { memories } from './db/schema.js';

/**
 * Cortex memory engine.
 *
 * Five kinds of memory, all stored locally:
 *   - episodic   : what happened (a meeting, a task, an event)
 *   - semantic   : facts the agent knows (user preferences, project facts)
 *   - procedural : how to do something (recipes learned, tool patterns)
 *   - social     : relationships with other agents
 *   - economic   : earnings, contracts, reputation-relevant events
 *
 * Recall is a scored retrieval: importance * recency * text match.
 * Embeddings are planned; v1 uses keyword scoring so it works with zero setup.
 */

export function remember(opts: {
  agentId: string;
  kind: MemoryKind;
  key: string;
  value: string;
  importance?: number;
  sourceMessageId?: string;
}): Memory {
  const now = Date.now();
  const id = randomUUID();
  db.insert(memories)
    .values({
      id,
      agentId: opts.agentId,
      kind: opts.kind,
      key: opts.key,
      value: opts.value,
      importance: opts.importance ?? 0.5,
      sourceMessageId: opts.sourceMessageId,
      createdAt: now,
      lastAccessedAt: now,
    })
    .onConflictDoUpdate({
      target: [memories.agentId, memories.key],
      set: {
        value: opts.value,
        kind: opts.kind,
        importance: opts.importance ?? 0.5,
        lastAccessedAt: now,
      },
    })
    .run();

  return {
    id,
    agentId: opts.agentId,
    kind: opts.kind,
    key: opts.key,
    value: opts.value,
    hasEmbedding: false,
    importance: opts.importance ?? 0.5,
    sourceMessageId: opts.sourceMessageId,
    createdAt: now,
    lastAccessedAt: now,
  };
}

export function recall(q: MemoryQuery): Memory[] {
  const rows = db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.agentId, q.agentId),
        q.kind ? eq(memories.kind, q.kind) : sql`1=1`,
        q.minImportance != null ? gte(memories.importance, q.minImportance) : sql`1=1`,
      ),
    )
    .orderBy(desc(memories.importance), desc(memories.lastAccessedAt))
    .limit(q.limit * 4) // over-fetch, then score
    .all();

  const now = Date.now();
  const needle = q.text?.toLowerCase();
  const scored = rows.map((r) => {
    const ageDays = (now - r.lastAccessedAt) / (1000 * 60 * 60 * 24);
    const recency = Math.exp(-ageDays / 30); // half-life ~3 weeks
    const textMatch = needle
      ? (r.value.toLowerCase().includes(needle) ? 1 : 0) +
        (r.key.toLowerCase().includes(needle) ? 0.5 : 0)
      : 0.5;
    const score = r.importance * 0.5 + recency * 0.3 + Math.min(1, textMatch) * 0.2;
    return { r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, q.limit);

  // Update lastAccessedAt for returned rows
  if (top.length) {
    const ids = top.map((t) => t.r.id);
    for (const id of ids) {
      db.update(memories)
        .set({ lastAccessedAt: now })
        .where(eq(memories.id, id))
        .run();
    }
  }

  return top.map<Memory>(({ r }) => ({
    id: r.id,
    agentId: r.agentId,
    kind: r.kind as MemoryKind,
    key: r.key,
    value: r.value,
    hasEmbedding: false,
    importance: r.importance,
    sourceMessageId: r.sourceMessageId ?? undefined,
    createdAt: r.createdAt,
    lastAccessedAt: now,
  }));
}

/**
 * Memory consolidation — runs during "sleep" and at Night Shift start.
 * Drops old, low-importance episodic memories that have been superseded,
 * and promotes frequently-accessed facts.
 */
export function consolidate(agentId: string): { dropped: number; promoted: number } {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days
  const toDrop = db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.agentId, agentId),
        eq(memories.kind, 'episodic'),
        sql`${memories.importance} < 0.2`,
        sql`${memories.lastAccessedAt} < ${cutoff}`,
      ),
    )
    .all();
  for (const m of toDrop) db.delete(memories).where(eq(memories.id, m.id)).run();

  const toPromote = db
    .select()
    .from(memories)
    .where(and(eq(memories.agentId, agentId), sql`${memories.importance} >= 0.7`))
    .all();
  for (const m of toPromote) {
    db.update(memories)
      .set({ kind: 'semantic' })
      .where(eq(memories.id, m.id))
      .run();
  }

  return { dropped: toDrop.length, promoted: toPromote.length };
}

export function memorySummary(agentId: string): string {
  const rows = recall({ agentId, limit: 12 });
  if (!rows.length) return '(no memories yet)';
  return rows.map((m) => `- [${m.kind}] ${m.key}: ${m.value}`).join('\n');
}