import type { FastifyInstance } from 'fastify';
import { ask, listPolicies, resolvePermission, deletePolicy } from '../permissions.js';
import { z } from 'zod';

const RequestBody = z.object({
  agentId: z.string(),
  kind: z.string(),
  scope: z.string(),
  reason: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
});

const ResolveBody = z.object({
  id: z.string(),
  decision: z.enum(['allow_once', 'allow_always', 'deny']),
  note: z.string().optional(),
});

export async function registerPermissionRoutes(app: FastifyInstance) {
  app.get('/permissions/policies', async () => listPolicies());

  app.delete('/permissions/policies/:id', async (req) => {
    const { id } = req.params as { id: string };
    deletePolicy(id);
    return { ok: true };
  });

  app.post('/permissions/request', async (req, reply) => {
    const parsed = RequestBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const allowed = await ask(parsed.data as any);
    return { allowed };
  });

  app.post('/permissions/resolve', async (req, reply) => {
    const parsed = ResolveBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    await resolvePermission(parsed.data);
    return { ok: true };
  });
}