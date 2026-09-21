import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { mcpServers } from '../db/schema.js';
import { connectMcp, disconnectMcp, listMcpConnections } from '../mcp/client.js';

const McpInput = z.object({
  name: z.string(),
  transport: z.enum(['stdio', 'sse']),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  url: z.string().optional(),
  enabled: z.boolean().default(true),
  trustedTools: z.array(z.string()).default([]),
});

export async function registerMcpRoutes(app: FastifyInstance) {
  app.get('/mcp', async () => db.select().from(mcpServers).all().map(hydrate));
  app.get('/mcp/live', async () => listMcpConnections());

  app.post('/mcp', async (req, reply) => {
    const parsed = McpInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const id = randomUUID();
    db.insert(mcpServers)
      .values({
        id,
        name: parsed.data.name,
        transport: parsed.data.transport,
        command: parsed.data.command ?? null,
        argsJson: JSON.stringify(parsed.data.args),
        envJson: JSON.stringify(parsed.data.env),
        url: parsed.data.url ?? null,
        enabled: parsed.data.enabled,
        trustedToolsJson: JSON.stringify(parsed.data.trustedTools),
      })
      .run();
    if (parsed.data.enabled) {
      try {
        await connectMcp({
          id,
          name: parsed.data.name,
          transport: parsed.data.transport,
          command: parsed.data.command,
          args: parsed.data.args,
          env: parsed.data.env,
          url: parsed.data.url,
          enabled: true,
          trustedTools: parsed.data.trustedTools,
        });
      } catch (e) {
        return { ok: false, error: (e as Error).message, id };
      }
    }
    const row = db.select().from(mcpServers).where(eq(mcpServers.id, id)).all()[0]!;
    return { ok: true, server: hydrate(row) };
  });

  app.delete('/mcp/:id', async (req) => {
    const { id } = req.params as { id: string };
    await disconnectMcp(id);
    db.delete(mcpServers).where(eq(mcpServers.id, id)).run();
    return { ok: true };
  });
}

function hydrate(r: typeof mcpServers.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    transport: r.transport,
    command: r.command ?? undefined,
    args: JSON.parse(r.argsJson),
    env: JSON.parse(r.envJson),
    url: r.url ?? undefined,
    enabled: r.enabled,
    trustedTools: JSON.parse(r.trustedToolsJson),
  };
}