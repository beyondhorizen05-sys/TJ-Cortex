import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get('/settings', async () => {
    const rows = db.select().from(settings).all();
    return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  });

  app.get('/settings/:key', async (req, reply) => {
    const { key } = req.params as { key: string };
    const r = db.select().from(settings).where(eq(settings.key, key)).all()[0];
    if (!r) return reply.code(404).send({ error: 'not found' });
    return JSON.parse(r.value);
  });

  app.put('/settings/:key', async (req) => {
    const { key } = req.params as { key: string };
    const value = JSON.stringify(req.body);
    const now = Date.now();
    db.insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
      .run();
    return { ok: true };
  });
}