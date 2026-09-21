import type { FastifyInstance } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client.js';
import { conversations, messages as messagesTbl } from '../db/schema.js';
import { runTurn } from '../agents/runtime.js';

const RunTurnBody = z.object({
  agentId: z.string(),
  conversationId: z.string().optional(),
  input: z.string().min(1),
  fallback: z
    .array(z.object({ providerId: z.string(), model: z.string() }))
    .optional(),
});

export async function registerConversationRoutes(app: FastifyInstance) {
  app.get('/conversations', async () => db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all());

  app.get('/conversations/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const c = db.select().from(conversations).where(eq(conversations.id, id)).all()[0];
    if (!c) return reply.code(404).send({ error: 'not found' });
    const msgs = db
      .select()
      .from(messagesTbl)
      .where(eq(messagesTbl.conversationId, id))
      .orderBy(messagesTbl.createdAt)
      .all();
    return { ...c, messages: msgs };
  });

  app.post('/conversations/:id/messages', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = RunTurnBody.safeParse({ ...(req.body as any), conversationId: id });
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const result = await runTurn(parsed.data as any);
    return result;
  });

  app.post('/run', async (req, reply) => {
    const parsed = RunTurnBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const result = await runTurn(parsed.data as any);
    return result;
  });

  app.delete('/conversations/:id', async (req) => {
    const { id } = req.params as { id: string };
    db.delete(conversations).where(eq(conversations.id, id)).run();
    db.delete(messagesTbl).where(eq(messagesTbl.conversationId, id)).run();
    return { ok: true };
  });
}