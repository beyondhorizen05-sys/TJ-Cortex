import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { CeoProfile, CeoSetupInput } from '@tj-cortex/shared';
import { db } from '../db/client.js';
import { agents, reputations, settings, wallets } from '../db/schema.js';
import { broadcast } from '../ws.js';
import { WS_EVENTS } from '@tj-cortex/shared';

const CEO_SETTING_KEY = 'ceo.profile';

export async function registerCeoRoutes(app: FastifyInstance) {
  app.get('/ceo', async () => {
    return readCeoProfile();
  });

  app.post('/ceo/setup', async (req, reply) => {
    const parsed = CeoSetupInput.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const existing = readCeoProfile();
    if (existing.setupComplete) {
      return reply.code(409).send({ error: 'CEO identity is already configured' });
    }

    const now = Date.now();
    const agentId = randomUUID();
    const walletId = randomUUID();

    db.insert(wallets)
      .values({
        id: walletId,
        agentId,
        label: 'CEO wallet',
        balanceCC: 0,
        escrowCC: 0,
        createdAt: now,
      })
      .run();

    db.insert(reputations)
      .values({
        agentId,
        score: 0,
        contractsCompleted: 0,
        contractsDisputed: 0,
        totalEarnedCC: 0,
        totalSpentCC: 0,
        updatedAt: now,
      })
      .run();

    db.insert(agents)
      .values({
        id: agentId,
        name: parsed.data.name,
        role: 'coordinator',
        systemPrompt:
          'You are the CEO AI agent of TJ-Cortex. Coordinate the agent crew, clarify objectives, delegate work through the existing capability and permission system, and keep decisions grounded in verified runtime state.',
        avatarJson: JSON.stringify({
          skinTone: '#E8B98A',
          hairStyle: 'long-voluminous-waves',
          hairColor: '#211712',
          outfit: 'ceo-black-gold',
          accentColor: '#D4AF37',
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
        reputationId: agentId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const profile: CeoProfile = {
      agentId,
      name: parsed.data.name,
      setupComplete: true,
    };

    db.insert(settings)
      .values({
        key: CEO_SETTING_KEY,
        value: JSON.stringify(profile),
        updatedAt: now,
      })
      .run();

    const row = db.select().from(agents).where(eq(agents.id, agentId)).all()[0]!;
    broadcast(WS_EVENTS.AgentCreated, hydrateAgent(row));

    return profile;
  });
}

function readCeoProfile(): CeoProfile {
  const row = db.select().from(settings).where(eq(settings.key, CEO_SETTING_KEY)).all()[0];
  if (!row) {
    return { agentId: '', name: '', setupComplete: false };
  }

  try {
    const parsed = CeoProfile.safeParse(JSON.parse(row.value));
    if (parsed.success) return parsed.data;
  } catch {
    // Treat invalid legacy data as incomplete instead of blocking startup.
  }

  return { agentId: '', name: '', setupComplete: false };
}

function hydrateAgent(row: typeof agents.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
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
}
