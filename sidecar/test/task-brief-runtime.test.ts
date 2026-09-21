import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { taskBriefs } from '../src/db/schema.js';
import { invokeTool } from '../src/tools/registry.js';
import '../src/tools/task-brief.js';

test('task_brief.ask pauses until the persisted brief is answered', async () => {
  const agentId = 'task-brief-runtime-' + randomUUID();
  const promise = invokeTool(agentId, 'task_brief.ask', {
    title: 'Pick a path',
    question: 'Which path should the agent use?',
    options: [
      { id: 'safe', label: 'Safe path', description: 'Use the conservative route.' },
      { id: 'fast', label: 'Fast path', description: 'Use the faster route.' },
    ],
  });

  await new Promise((resolve) => setTimeout(resolve, 25));
  const pending = db.select().from(taskBriefs).where(eq(taskBriefs.agentId, agentId)).all()[0];
  assert.ok(pending);
  assert.equal(pending.status, 'pending');

  db.update(taskBriefs).set({
    status: 'answered',
    selectedOptionId: 'fast',
    answerNote: 'Use the faster route.',
    answeredAt: Date.now(),
  }).where(eq(taskBriefs.id, pending.id)).run();

  const result = await promise;
  assert.equal(result.ok, true);
  const output = result.output as Record<string, unknown>;
  assert.equal(output.briefId, pending.id);
  assert.equal(output.selectedOptionId, 'fast');

  db.delete(taskBriefs).where(eq(taskBriefs.id, pending.id)).run();
});
