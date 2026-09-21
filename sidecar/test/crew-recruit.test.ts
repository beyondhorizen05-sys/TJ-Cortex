import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { createServer } from '../src/server.js';
import { db } from '../src/db/client.js';
import { agents, reputations, wallets } from '../src/db/schema.js';

test('crew recruitment creates a real persisted specialist agent', async () => {
  const app = await createServer();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/crew/recruit',
      payload: { crewClassId: 'researcher', name: 'Research Specialist' },
    });

    assert.equal(response.statusCode, 200);
    const agent = response.json();

    assert.equal(agent.name, 'Research Specialist');
    assert.equal(agent.crewClassId, 'researcher');
    assert.equal(agent.role, 'researcher');
    assert.ok(agent.walletId);
    assert.ok(agent.reputationId);

    const row = db.select().from(agents).where(eq(agents.id, agent.id)).all()[0];
    assert.equal(row?.crewClassId, 'researcher');

    db.delete(agents).where(eq(agents.id, agent.id)).run();
    db.delete(wallets).where(eq(wallets.id, agent.walletId)).run();
    db.delete(reputations).where(eq(reputations.agentId, agent.id)).run();
  } finally {
    await app.close();
  }
});
