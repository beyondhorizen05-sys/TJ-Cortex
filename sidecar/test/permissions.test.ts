import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { permissionPolicies, permissionRequests } from '../src/db/schema.js';
import { ask } from '../src/permissions.js';

test('allow_always policy auto-allows and records a resolved request', async () => {
  const scope = 'test.permission:' + randomUUID();
  const agentId = 'test-agent-' + randomUUID();

  db.insert(permissionPolicies).values({
    id: randomUUID(),
    kind: 'voice.speak',
    scope,
    decision: 'allow_always',
    grantedAt: Date.now(),
  }).run();

  try {
    const allowed = await ask({
      agentId,
      kind: 'voice.speak',
      scope,
      reason: 'Test permission',
      risk: 'medium',
    });

    assert.equal(allowed, true);

    const rows = db.select().from(permissionRequests)
      .where(and(eq(permissionRequests.agentId, agentId), eq(permissionRequests.scope, scope)))
      .all();

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, 'resolved');
    assert.equal(rows[0]?.decision, 'allow_always');
  } finally {
    db.delete(permissionRequests)
      .where(and(eq(permissionRequests.agentId, agentId), eq(permissionRequests.scope, scope)))
      .run();
    db.delete(permissionPolicies).where(eq(permissionPolicies.scope, scope)).run();
  }
});
