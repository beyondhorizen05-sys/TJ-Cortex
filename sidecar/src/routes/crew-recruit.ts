import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { getCrewClass } from '@tj-cortex/shared';
import { db } from '../db/client.js';
import { agents, reputations, wallets } from '../db/schema.js';
import { broadcast } from '../ws.js';
import { WS_EVENTS } from '@tj-cortex/shared';

interface RecruitBody {
  crewClassId?: unknown;
  name?: unknown;
}

export async function registerCrewRecruitRoutes(app: FastifyInstance) {
  app.post('/crew/recruit', async (req, reply) => {
    const body = (req.body ?? {}) as RecruitBody;
    if (typeof body.crewClassId !== 'string' || !body.crewClassId.trim()) {
      return reply.code(400).send({ error: 'crewClassId is required' });
    }

    const crewClass = getCrewClass(body.crewClassId.trim());
    if (!crewClass) {
      return reply.code(404).send({ error: 'unknown crew class' });
    }

    const name = typeof body.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : crewClass.name;

    const now = Date.now();
    const id = randomUUID();
    const walletId = randomUUID();

    db.insert(wallets).values({
      id: walletId,
      agentId: id,
      label: name + ' wallet',
      balanceCC: 0,
      escrowCC: 0,
      createdAt: now,
    }).run();

    db.insert(reputations).values({
      agentId: id,
      score: 0,
      contractsCompleted: 0,
      contractsDisputed: 0,
      totalEarnedCC: 0,
      totalSpentCC: 0,
      updatedAt: now,
    }).run();

    db.insert(agents).values({
      id,
      name,
      crewClassId: crewClass.id,
      role: crewClass.role,
      systemPrompt: [
        'You are a TJ-Cortex crew specialist.',
        'Crew class: ' + crewClass.name + '.',
        crewClass.summary,
        'Suggested capabilities: ' + crewClass.suggestedTools.join(', ') + '.',
        'Operate only through the existing runtime, capability boundaries, permissions, and verified state.',
      ].join(' '),
      avatarJson: JSON.stringify({
        skinTone: '#E8B98A',
        hairStyle: 'short',
        hairColor: '#2B1B12',
        outfit: 'crew-' + crewClass.id,
        accentColor: '#6C4CF1',
        glowColor: '#22D3EE',
      }),
      boundariesJson: JSON.stringify({}),
      providerId: 'gemini',
      modelId: 'gemini-2.0-flash',
      state: 'idle',
      location: 'node',
      posX: 0,
      posZ: 0,
      walletId,
      reputationId: id,
      createdAt: now,
      updatedAt: now,
    }).run();

    const row = db.select().from(agents).all().find((agent) => agent.id === id);
    if (!row) return reply.code(500).send({ error: 'crew recruitment failed' });

    const out = {
      id: row.id,
      name: row.name,
      crewClassId: row.crewClassId ?? undefined,
      role: row.role,
      systemPrompt: row.systemPrompt,
      avatar: JSON.parse(row.avatarJson || '{}'),
      boundaries: JSON.parse(row.boundariesJson || '{}'),
      providerId: row.providerId,
      modelId: row.modelId,
      state: row.state,
      location: row.location,
      position: { x: row.posX, z: row.posZ },
      walletId: row.walletId,
      reputationId: row.reputationId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    broadcast(WS_EVENTS.AgentCreated, out);
    return out;
  });
}
