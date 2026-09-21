import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { skills } from '../db/schema.js';

const SkillInput = z.object({
  name: z.string(),
  description: z.string().default(''),
  kind: z.enum(['prompt', 'tool', 'composite']),
  promptTemplate: z.string().optional(),
  toolName: z.string().optional(),
  composedSkills: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export async function registerSkillRoutes(app: FastifyInstance) {
  app.get('/skills', async () => db.select().from(skills).all().map(hydrate));

  app.post('/skills', async (req, reply) => {
    const parsed = SkillInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const id = randomUUID();
    db.insert(skills)
      .values({
        id,
        name: parsed.data.name,
        description: parsed.data.description,
        kind: parsed.data.kind,
        promptTemplate: parsed.data.promptTemplate ?? null,
        toolName: parsed.data.toolName ?? null,
        composedSkillsJson: JSON.stringify(parsed.data.composedSkills),
        enabled: parsed.data.enabled,
        createdAt: Date.now(),
      })
      .run();
    const s = db.select().from(skills).where(eq(skills.id, id)).all()[0]!;
    return hydrate(s);
  });

  app.patch('/skills/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
    if (typeof body.name === 'string') patch.name = body.name;
    if (typeof body.description === 'string') patch.description = body.description;
    if (typeof body.promptTemplate === 'string') patch.promptTemplate = body.promptTemplate;
    db.update(skills).set(patch).where(eq(skills.id, id)).run();
    const s = db.select().from(skills).where(eq(skills.id, id)).all()[0];
    if (!s) return reply.code(404).send({ error: 'not found' });
    return hydrate(s);
  });

  app.delete('/skills/:id', async (req) => {
    const { id } = req.params as { id: string };
    db.delete(skills).where(eq(skills.id, id)).run();
    return { ok: true };
  });
}

function hydrate(s: typeof skills.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    kind: s.kind,
    promptTemplate: s.promptTemplate ?? undefined,
    toolName: s.toolName ?? undefined,
    composedSkills: JSON.parse(s.composedSkillsJson),
    enabled: s.enabled,
    createdAt: s.createdAt,
  };
}