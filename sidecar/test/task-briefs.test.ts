import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { taskBriefs } from '../src/db/schema.js';

test('Task Brief persists options and resolves exactly once', () => {
  const id = randomUUID();
  const agentId = 'task-brief-test-' + randomUUID();
  const now = Date.now();
  const options = [
    { id: 'option-a', label: 'Use the existing draft', description: 'Continue from the current document.' },
    { id: 'option-b', label: 'Start fresh', description: 'Create a new document.' },
  ];

  db.insert(taskBriefs).values({
    id,
    agentId,
    title: 'Choose the document path',
    question: 'Should the next run continue the existing draft or start fresh?',
    optionsJson: JSON.stringify(options),
    status: 'pending',
    createdAt: now,
  }).run();

  try {
    const pending = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0];
    assert.equal(pending?.status, 'pending');
    assert.deepEqual(JSON.parse(pending?.optionsJson ?? '[]'), options);

    const answeredAt = now + 1;
    db.update(taskBriefs).set({
      status: 'answered',
      selectedOptionId: 'option-b',
      answerNote: 'Start fresh for this run.',
      answeredAt,
    }).where(eq(taskBriefs.id, id)).run();

    const answered = db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all()[0];
    assert.equal(answered?.status, 'answered');
    assert.equal(answered?.selectedOptionId, 'option-b');
    assert.equal(answered?.answeredAt, answeredAt);

    db.delete(taskBriefs).where(eq(taskBriefs.id, id)).run();
    assert.equal(db.select().from(taskBriefs).where(eq(taskBriefs.id, id)).all().length, 0);
  } finally {
    db.delete(taskBriefs).where(eq(taskBriefs.id, id)).run();
  }
});
