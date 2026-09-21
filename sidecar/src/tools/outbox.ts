import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { registerTool } from './registry.js';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { outboxItems } from '../db/schema.js';
import { broadcast } from '../ws.js';
import { WS_EVENTS } from '@tj-cortex/shared';

/**
 * OUTBOX — the deliverables vault. Every file an agent produces for the user
 * lands here, is logged in the DB, and is broadcast as an `outbox.updated`
 * event. This is the only place agents are allowed to write user-facing
 * deliverables.
 */

registerTool({
  descriptor: {
    name: 'outbox.deliver',
    category: 'outbox',
    description: 'Deliver a file to the OUTBOX. The user is notified.',
    risk: 'write',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        filename: { type: 'string' },
        content: { type: 'string' },
        mimeType: { type: 'string' },
        refType: { type: 'string' },
        refId: { type: 'string' },
      },
      required: ['title', 'filename', 'content'],
    },
    requiresConsent: false,
    scoped: true,
    enabled: true,
  },
  async run(inv) {
    const title = String(inv.args.title);
    const filename = String(inv.args.filename);
    const content = String(inv.args.content);
    const mimeType = (inv.args.mimeType as string) ?? guessMime(filename);
    const refType = inv.args.refType as string | undefined;
    const refId = inv.args.refId as string | undefined;

    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_');
    const dir = join(config.outboxDir, new Date().toISOString().slice(0, 10));
    await mkdir(dir, { recursive: true });
    const path = resolve(dir, safeName);
    await writeFile(path, content, 'utf8');
    const s = await stat(path);

    const id = randomUUID();
    const now = Date.now();
    db.insert(outboxItems)
      .values({
        id,
        agentId: inv.agentId,
        title,
        path,
        mimeType,
        sizeBytes: s.size,
        refType,
        refId,
        createdAt: now,
      })
      .run();

    const item = {
      id,
      agentId: inv.agentId,
      title,
      path,
      mimeType,
      sizeBytes: s.size,
      refType,
      refId,
      createdAt: now,
    };
    broadcast(WS_EVENTS.OutboxUpdated, item);
    return item;
  },
});

function guessMime(name: string): string {
  if (name.endsWith('.md')) return 'text/markdown';
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.html')) return 'text/html';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}