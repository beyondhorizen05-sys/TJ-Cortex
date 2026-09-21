import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { negotiate } from '../agents/negotiation.js';

const Body = z.object({
  clientAgentId: z.string(),
  workerAgentId: z.string(),
  topic: z.string(),
  brief: z.string(),
  maxRounds: z.number().int().positive().optional(),
  startingOfferCC: z.number().positive().optional(),
});

export async function registerNegotiationRoutes(app: FastifyInstance) {
  app.post('/negotiate', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try { return await negotiate(parsed.data); }
    catch (e) { return reply.code(500).send({ error: (e as Error).message }); }
  });
}