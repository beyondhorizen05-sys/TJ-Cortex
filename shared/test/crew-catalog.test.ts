import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CREW_CLASSES, getCrewClass } from '@tj-cortex/shared';

test('crew catalog contains the StarNet-derived builtin and archive surfaces', () => {
  const builtin = CREW_CLASSES.filter((item) => item.tier === 'builtin');
  const archive = CREW_CLASSES.filter((item) => item.tier === 'archive');

  assert.equal(builtin.length, 12);
  assert.equal(archive.length, 9);
  assert.equal(CREW_CLASSES.length, 21);
  assert.equal(getCrewClass('researcher')?.name, 'Researcher');
  assert.equal(getCrewClass('translator')?.tier, 'archive');
  assert.equal(getCrewClass('missing'), undefined);

  for (const item of CREW_CLASSES) {
    assert.ok(item.id);
    assert.ok(item.name);
    assert.ok(item.summary);
    assert.ok(item.suggestedTools.length > 0);
  }
});
