import type { FastifyInstance } from 'fastify';
import { listTools, invokeTool } from '../tools/registry.js';
import { z } from 'zod';

const InvokeBody = z.object({
  agentId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()).default({}),
});

export async function registerToolRoutes(app: FastifyInstance) {
  app.get('/tools', async () => listTools());

  app.post('/tools/invoke', async (req, reply) => {
    const parsed = InvokeBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const result = await invokeTool(parsed.data.agentId, parsed.data.toolName, parsed.data.args);
    return result;
  });
}