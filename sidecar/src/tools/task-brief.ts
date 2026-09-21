import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { WS_EVENTS } from '@tj-cortex/shared';
import { db } from '../db/client.js';
import { taskBriefs } from '../db/schema.js';
import { broadcast } from '../ws.js';
import { registerTool } from './registry.js';

type Option = { id: string; label: string; description: string };

function createBrief(agentId: string, title: string, question: string, options: Option[], expiresAt?: number) {
  const id = randomUUID();
  const createdAt = Date.now();
  db.insert(taskBriefs).values({
    id, agentId, title, question, optionsJson: JSON.stringify(options),
    status: 'pending', createdAt, expiresAt: expiresAt ?? null,
  }).run();
  const row = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0]!;
  const brief = hydrate(row);
  broadcast(WS_EVENTS.TaskBriefCreated, brief);
  return brief;
}

function hydrate(row: typeof taskBriefs.$inferSelect) {
  return {
    id: row.id, agentId: row.agentId, title: row.title, question: row.question,
    options: JSON.parse(row.optionsJson) as Option[], status: row.status,
    selectedOptionId: row.selectedOptionId ?? undefined,
    answerNote: row.answerNote ?? undefined, createdAt: row.createdAt,
    answeredAt: row.answeredAt ?? undefined, expiresAt: row.expiresAt ?? undefined,
  };
}

async function waitForResolution(id: string): Promise<Record<string, unknown>> {
  for (;;) {
    const row = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0];
    if (!row) throw new Error('Task Brief was deleted.');
    if (row.status === 'answered') {
      return {
        status: row.status,
        selectedOptionId: row.selectedOptionId,
        answerNote: row.answerNote ?? undefined,
      };
    }
    if (row.status === 'cancelled') throw new Error('Task Brief was cancelled by the user.');
    if (row.status === 'expired') throw new Error('Task Brief expired before it was answered.');
    if (row.expiresAt !== null && row.expiresAt <= Date.now()) {
      db.update(taskBriefs).set({ status: 'expired' }).where(and(eq(taskBriefs.id, id), eq(taskBriefs.status, 'pending'))).run();
      const expired = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0]!;
      broadcast(WS_EVENTS.TaskBriefCancelled, hydrate(expired));
      throw new Error('Task Brief expired before it was answered.');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

registerTool({
  descriptor: {
    name: 'task_brief.ask',
    category: 'memory',
    description: 'Pause the current agent run and ask the user to choose one of several explicit options. The tool resumes only after the user answers.',
    risk: 'read',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title shown to the user.' },
        question: { type: 'string', description: 'The decision the user needs to make.' },
        options: { type: 'array', description: 'At least two choices, each with id, label, and optional description.' },
        expiresAt: { type: 'number', description: 'Optional Unix timestamp in milliseconds when the brief expires.' },
      },
      required: ['title', 'question', 'options'],
    },
    requiresConsent: false,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const title = String(inv.args.title ?? '').trim();
    const question = String(inv.args.question ?? '').trim();
    const rawOptions = Array.isArray(inv.args.options) ? inv.args.options : [];
    if (!title || !question) throw new Error('title and question are required.');
    if (rawOptions.length < 2) throw new Error('task_brief.ask requires at least two options.');
    const options = rawOptions.map((value, index) => {
      if (!value || typeof value !== 'object') throw new Error('Each option must be an object.');
      const item = value as Record<string, unknown>;
      const id = String(item.id ?? '').trim();
      const label = String(item.label ?? '').trim();
      const description = String(item.description ?? '').trim();
      if (!id || !label) throw new Error(`Option ${index + 1} requires id and label.`);
      return { id, label, description };
    });
    const ids = new Set(options.map((option) => option.id));
    if (ids.size !== options.length) throw new Error('Task Brief option ids must be unique.');
    const expiresAt = typeof inv.args.expiresAt === 'number' ? inv.args.expiresAt : undefined;
    const brief = createBrief(inv.agentId, title, question, options, expiresAt);
    const resolution = await waitForResolution(brief.id);
    return { briefId: brief.id, ...resolution };
  },
});
