import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { taskBriefs } from '../db/schema.js';

const Option = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(''),
});

const CreateTaskBrief = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1),
  question: z.string().min(1),
  options: z.array(Option).min(1),
  expiresAt: z.number().int().positive().optional(),
});

const ResolveTaskBrief = z.object({
  optionId: z.string().min(1),
  note: z.string().optional(),
});

export async function registerTaskBriefRoutes(app: FastifyInstance) {
  app.get('/task-briefs', async (req) => {
    const agentId = (req.query as { agentId?: string } | undefined)?.agentId;
    const rows = agentId
      ? db.select().from(taskBriefs).where(eq(taskBriefs.agentId, agentId)).orderBy(desc(taskBriefs.createdAt)).all()
      : db.select().from(taskBriefs).orderBy(desc(taskBriefs.createdAt)).all();
    return rows.map(hydrate);
  });

  app.get('/task-briefs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0];
    if (!row) return reply.code(404).send({ error: 'not found' });
    return hydrate(row);
  });

  app.post('/task-briefs', async (req, reply) => {
    const parsed = CreateTaskBrief.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const id = randomUUID();
    const now = Date.now();
    db.insert(taskBriefs).values({
      id,
      agentId: parsed.data.agentId,
      title: parsed.data.title,
      question: parsed.data.question,
      optionsJson: JSON.stringify(parsed.data.options),
      status: 'pending',
      createdAt: now,
      expiresAt: parsed.data.expiresAt ?? null,
    }).run();

    return hydrate(db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0]!);
  });

  app.post('/task-briefs/:id/resolve', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = ResolveTaskBrief.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const row = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0];
    if (!row) return reply.code(404).send({ error: 'not found' });
    if (row.status !== 'pending') return reply.code(409).send({ error: 'task brief is not pending' });

    const options = JSON.parse(row.optionsJson) as Array<{ id: string }>;
    if (!options.some((option) => option.id === parsed.data.optionId)) {
      return reply.code(400).send({ error: 'option not found' });
    }

    const answeredAt = Date.now();
    db.update(taskBriefs).set({
      status: 'answered',
      selectedOptionId: parsed.data.optionId,
      answerNote: parsed.data.note ?? null,
      answeredAt,
    }).where(eq(taskBriefs.id, id)).run();

    return hydrate(db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0]!);
  });

  app.post('/task-briefs/:id/cancel', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0];
    if (!row) return reply.code(404).send({ error: 'not found' });
    if (row.status !== 'pending') return reply.code(409).send({ error: 'task brief is not pending' });

    db.update(taskBriefs).set({ status: 'cancelled' }).where(eq(taskBriefs.id, id)).run();
    return hydrate(db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0]!);
  });
}

function hydrate(row: typeof taskBriefs.$inferSelect) {
  return {
    id: row.id,
    agentId: row.agentId,
    title: row.title,
    question: row.question,
    options: JSON.parse(row.optionsJson),
    status: row.status,
    selectedOptionId: row.selectedOptionId ?? undefined,
    answerNote: row.answerNote ?? undefined,
    createdAt: row.createdAt,
    answeredAt: row.answeredAt ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
  };
}
