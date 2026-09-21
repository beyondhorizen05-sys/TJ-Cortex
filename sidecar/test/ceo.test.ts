import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { createServer } from '../src/server.js';
import { db } from '../src/db/client.js';
import { agents, reputations, settings, wallets } from '../src/db/schema.js';

test('CEO onboarding creates and persists the named CEO agent', async () => {
  const app = await createServer();
  const settingKey = 'ceo.profile';

  db.delete(settings).where(eq(settings.key, settingKey)).run();

  try {
    const before = await app.inject({ method: 'GET', url: '/ceo' });
    assert.equal(before.statusCode, 200);
    assert.deepEqual(before.json(), { agentId: '', name: '', setupComplete: false });

    const setup = await app.inject({
      method: 'POST',
      url: '/ceo/setup',
      payload: { name: 'Test CEO' },
    });
    assert.equal(setup.statusCode, 200);

    const profile = setup.json();
    assert.equal(profile.name, 'Test CEO');
    assert.equal(profile.setupComplete, true);
    assert.ok(profile.agentId);

    const agent = db.select().from(agents).where(eq(agents.id, profile.agentId)).all()[0];
    assert.equal(agent?.name, 'Test CEO');
    assert.equal(agent?.role, 'coordinator');

    const secondSetup = await app.inject({
      method: 'POST',
      url: '/ceo/setup',
      payload: { name: 'Second CEO' },
    });
    assert.equal(secondSetup.statusCode, 409);

    const after = await app.inject({ method: 'GET', url: '/ceo' });
    assert.deepEqual(after.json(), profile);

    db.delete(agents).where(eq(agents.id, profile.agentId)).run();
    db.delete(wallets).where(eq(wallets.id, agent?.walletId ?? '')).run();
    db.delete(reputations).where(eq(reputations.agentId, profile.agentId)).run();
  } finally {
    db.delete(settings).where(eq(settings.key, settingKey)).run();
    await app.close();
  }
});
