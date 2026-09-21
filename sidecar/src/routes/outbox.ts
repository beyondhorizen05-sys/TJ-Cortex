import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { outboxItems } from '../db/schema.js';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

export async function registerOutboxRoutes(app: FastifyInstance) {
  app.get('/outbox', async () => {
    return db.select().from(outboxItems).orderBy(desc(outboxItems.createdAt)).all();
  });

  app.get('/outbox/:id/raw', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(outboxItems).where(eq(outboxItems.id, id)).all()[0];
    if (!row) return reply.code(404).send({ error: 'not found' });
    const s = await stat(row.path);
    reply.header('Content-Type', row.mimeType ?? 'application/octet-stream');
    reply.header('Content-Length', String(s.size));
    return reply.send(createReadStream(row.path));
  });

  app.delete('/outbox/:id', async (req) => {
    const { id } = req.params as { id: string };
    db.delete(outboxItems).where(eq(outboxItems.id, id)).run();
    return { ok: true };
  });
}