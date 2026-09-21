import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agents, wallets, reputations } from '../db/schema.js';
import { AgentCreateInput } from '@tj-cortex/shared';
import { broadcast } from '../ws.js';
import { WS_EVENTS } from '@tj-cortex/shared';

export async function registerAgentRoutes(app: FastifyInstance) {
  app.get('/agents', async () => {
    return db.select().from(agents).all().map(hydrate);
  });

  app.get('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(agents).where(eq(agents.id, id)).all()[0];
    if (!row) return reply.code(404).send({ error: 'not found' });
    return hydrate(row);
  });

  app.post('/agents', async (req, reply) => {
    const parsed = AgentCreateInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const input = parsed.data;
    const now = Date.now();
    const id = randomUUID();
    const walletId = randomUUID();
    const repId = id; // reputation is keyed by agentId

    db.insert(wallets)
      .values({ id: walletId, agentId: id, label: `${input.name} wallet`, balanceCC: 0, escrowCC: 0, createdAt: now })
      .run();
    db.insert(reputations)
      .values({
        agentId: repId,
        score: 0,
        contractsCompleted: 0,
        contractsDisputed: 0,
        totalEarnedCC: 0,
        totalSpentCC: 0,
        updatedAt: now,
      })
      .run();

    db.insert(agents)
      .values({
        id,
        name: input.name,
        role: input.role ?? 'generalist',
        systemPrompt: input.systemPrompt ?? '',
        avatarJson: JSON.stringify(input.avatar ?? {}),
        boundariesJson: JSON.stringify(input.boundaries ?? {}),
        providerId: input.providerId ?? 'gemini',
        modelId: input.modelId ?? 'gemini-2.0-flash',
        state: 'idle',
        location: 'node',
        posX: input.position?.x ?? 0,
        posZ: input.position?.z ?? 0,
        walletId,
        reputationId: repId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const row = db.select().from(agents).where(eq(agents.id, id)).all()[0]!;
    const out = hydrate(row);
    broadcast(WS_EVENTS.AgentCreated, out);
    return out;
  });

  app.patch('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (typeof body.name === 'string') patch.name = body.name;
    if (typeof body.systemPrompt === 'string') patch.systemPrompt = body.systemPrompt;
    if (typeof body.providerId === 'string') patch.providerId = body.providerId;
    if (typeof body.modelId === 'string') patch.modelId = body.modelId;
    if (body.avatar) patch.avatarJson = JSON.stringify(body.avatar);
    if (body.boundaries) patch.boundariesJson = JSON.stringify(body.boundaries);
    if (body.state) patch.state = body.state;
    if (body.location) patch.location = body.location;

    const result = db.update(agents).set(patch).where(eq(agents.id, id)).run();
    if (!result.changes) return reply.code(404).send({ error: 'not found' });

    const row = db.select().from(agents).where(eq(agents.id, id)).all()[0]!;
    const out = hydrate(row);
    broadcast(WS_EVENTS.AgentUpdated, out);
    return out;
  });

  app.delete('/agents/:id', async (req) => {
    const { id } = req.params as { id: string };
    db.delete(agents).where(eq(agents.id, id)).run();
    broadcast(WS_EVENTS.AgentDeleted, { id });
    return { ok: true };
  });
}

function hydrate(row: typeof agents.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    systemPrompt: row.systemPrompt,
    avatar: JSON.parse(row.avatarJson || '{}'),
    boundaries: JSON.parse(row.boundariesJson || '{}'),
    providerId: row.providerId,
    modelId: row.modelId,
    state: row.state,
    location: row.location,
    position: { x: row.posX, z: row.posZ },
    walletId: row.walletId,
    reputationId: row.reputationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}