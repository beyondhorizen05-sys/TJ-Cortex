import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { recipes } from '../db/schema.js';

const RecipeInput = z.object({
  name: z.string(),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  steps: z.array(z.any()).default([]),
});

export async function registerRecipeRoutes(app: FastifyInstance) {
  app.get('/recipes', async () => db.select().from(recipes).all().map(hydrate));

  app.get('/recipes/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const r = db.select().from(recipes).where(eq(recipes.id, id)).all()[0];
    if (!r) return reply.code(404).send({ error: 'not found' });
    return hydrate(r);
  });

  app.post('/recipes', async (req, reply) => {
    const parsed = RecipeInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const now = Date.now();
    const id = randomUUID();
    db.insert(recipes)
      .values({
        id,
        name: parsed.data.name,
        description: parsed.data.description,
        tagsJson: JSON.stringify(parsed.data.tags),
        stepsJson: JSON.stringify(parsed.data.steps),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const r = db.select().from(recipes).where(eq(recipes.id, id)).all()[0]!;
    return hydrate(r);
  });

  app.delete('/recipes/:id', async (req) => {
    const { id } = req.params as { id: string };
    db.delete(recipes).where(eq(recipes.id, id)).run();
    return { ok: true };
  });
}

function hydrate(r: typeof recipes.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    tags: JSON.parse(r.tagsJson),
    steps: JSON.parse(r.stepsJson),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}