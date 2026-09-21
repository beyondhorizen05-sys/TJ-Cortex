import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { wallets, ledgerEntries, contracts, bounties, guilds, reputations, agents as agentsTbl } from '../db/schema.js';
import { desc } from 'drizzle-orm';
import { getEconomy } from '../economy/wire.js';
import { ask } from '../permissions.js';

export async function registerEconomyRoutes(app: FastifyInstance) {
  /* ---------- Reads ---------- */
  app.get('/economy/wallets', async () => db.select().from(wallets).all());
  app.get('/economy/ledger', async (req) => {
    const limit = Number((req.query as any)?.limit ?? 200);
    return db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.ts)).limit(limit).all();
  });
  app.get('/economy/contracts', async () => db.select().from(contracts).orderBy(desc(contracts.updatedAt)).all());
  app.get('/economy/bounties', async () => db.select().from(bounties).orderBy(desc(bounties.createdAt)).all());
  app.get('/economy/guilds', async () => db.select().from(guilds).all());
  app.get('/economy/reputation/:agentId', async (req, reply) => {
    const { agentId } = req.params as { agentId: string };
    const r = db.select().from(reputations).where(eq(reputations.agentId, agentId)).all()[0];
    if (!r) return reply.code(404).send({ error: 'not found' });
    return r;
  });

  /* ---------- Audit ---------- */
  app.get('/economy/audit', async () => {
    const engine = await getEconomy();
    return engine.audit();
  });

  /* ---------- Writes ---------- */

  const ProposeBody = z.object({
    title: z.string(),
    brief: z.string(),
    clientAgentId: z.string(),
    amountCC: z.number().positive(),
    deliverables: z.array(z.string()).optional(),
  });

  app.post('/economy/contracts/propose', async (req, reply) => {
    const parsed = ProposeBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const engine = await getEconomy();
    try {
      return engine.proposeContract(parsed.data);
    } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  const AcceptBody = z.object({
    contractId: z.string(),
    workerAgentId: z.string(),
    consentGranted: z.boolean().optional(),
  });

  app.post('/economy/contracts/accept', async (req, reply) => {
    const parsed = AcceptBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const contract = db.select().from(contracts).where(eq(contracts.id, parsed.data.contractId)).all()[0];
    if (!contract) return reply.code(404).send({ error: 'contract not found' });
    const client = db.select().from(agentsTbl).where(eq(agentsTbl.id, contract.clientAgentId)).all()[0];
    if (!client) return reply.code(404).send({ error: 'client agent not found' });

    // If the boundary check would trip consent, ask the user first.
    const engine = await getEconomy();
    const clientAgent = {
      id: client.id,
      boundaries: JSON.parse(client.boundariesJson || '{}'),
    };
    const decision = engine.canSpend(
      clientAgent as any,
      { agentId: client.id, amountCC: contract.amountCC, kind: 'contract_escrow', refId: contract.id, reason: contract.title },
      parsed.data.consentGranted ?? false,
    );
    let granted = parsed.data.consentGranted ?? false;
    if (!decision.allowed && decision.requiresConsent) {
      granted = await ask({
        agentId: client.id,
        kind: 'economy.spend',
        scope: `${contract.id}:${contract.amountCC}`,
        reason: `Fund escrow for contract "${contract.title}" (${contract.amountCC.toFixed(2)} CC).`,
        risk: 'high',
      });
    }
    try {
      return engine.acceptContract({
        contractId: parsed.data.contractId,
        workerAgentId: parsed.data.workerAgentId,
        clientAgent: clientAgent as any,
        consentGranted: granted,
      });
    } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/contracts/:id/start', async (req, reply) => {
    const { id } = req.params as { id: string };
    const engine = await getEconomy();
    try { return engine.startContract(id); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/contracts/:id/deliver', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { note } = (req.body ?? {}) as { note?: string };
    const engine = await getEconomy();
    try { return engine.deliverContract(id, note); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/contracts/:id/settle', async (req, reply) => {
    const { id } = req.params as { id: string };
    const engine = await getEconomy();
    try { return engine.settleContract(id); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/contracts/:id/cancel', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { reason } = (req.body ?? {}) as { reason?: string };
    const engine = await getEconomy();
    try { return engine.cancelContract(id, reason ?? 'cancelled by user'); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  /* ---------- Bounties ---------- */
  const PostBountyBody = z.object({
    title: z.string(), brief: z.string(), rewardCC: z.number().positive(),
    postedByAgentId: z.string(), expiresAt: z.number().optional(),
  });

  app.post('/economy/bounties', async (req, reply) => {
    const parsed = PostBountyBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const poster = db.select().from(agentsTbl).where(eq(agentsTbl.id, parsed.data.postedByAgentId)).all()[0];
    if (!poster) return reply.code(404).send({ error: 'agent not found' });
    const engine = await getEconomy();
    const posterAgent = { id: poster.id, boundaries: JSON.parse(poster.boundariesJson || '{}') };
    const decision = engine.canSpend(
      posterAgent as any,
      { agentId: poster.id, amountCC: parsed.data.rewardCC, kind: 'bounty_escrow', reason: parsed.data.title },
      false,
    );
    let granted = false;
    if (!decision.allowed && decision.requiresConsent) {
      granted = await ask({
        agentId: poster.id, kind: 'economy.spend',
        scope: `bounty:${parsed.data.title}:${parsed.data.rewardCC}`,
        reason: `Post bounty "${parsed.data.title}" for ${parsed.data.rewardCC.toFixed(2)} CC.`,
        risk: 'high',
      });
    }
    try { return engine.postBounty({ ...parsed.data, postedByAgent: posterAgent as any, consentGranted: granted }); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/bounties/:id/claim', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { agentId } = (req.body ?? {}) as { agentId?: string };
    if (!agentId) return reply.code(400).send({ error: 'agentId required' });
    const engine = await getEconomy();
    try { return engine.claimBounty(id, agentId); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/bounties/:id/submit', async (req, reply) => {
    const { id } = req.params as { id: string };
    const engine = await getEconomy();
    try { return engine.submitBounty(id); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/bounties/:id/pay', async (req, reply) => {
    const { id } = req.params as { id: string };
    const engine = await getEconomy();
    try { return engine.payBounty(id); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  /* ---------- Guilds ---------- */
  app.post('/economy/guilds', async (req, reply) => {
    const { name, purpose, memberAgentIds } = req.body as any;
    if (!name || !purpose) return reply.code(400).send({ error: 'name and purpose required' });
    const engine = await getEconomy();
    try { return engine.createGuild({ name, purpose, foundingAgentIds: memberAgentIds ?? [] }); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/guilds/:id/join', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { agentId } = (req.body ?? {}) as { agentId?: string };
    if (!agentId) return reply.code(400).send({ error: 'agentId required' });
    const engine = await getEconomy();
    try { return engine.joinGuild(id, agentId); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  app.post('/economy/guilds/:id/leave', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { agentId } = (req.body ?? {}) as { agentId?: string };
    if (!agentId) return reply.code(400).send({ error: 'agentId required' });
    const engine = await getEconomy();
    try { return engine.leaveGuild(id, agentId); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });

  /* ---------- Treasury ---------- */
  app.post('/economy/treasury/mint', async (req, reply) => {
    const { toWalletId, amountCC, memo } = req.body as any;
    if (!toWalletId || typeof amountCC !== 'number' || !memo) {
      return reply.code(400).send({ error: 'toWalletId, amountCC, memo required' });
    }
    const engine = await getEconomy();
    try { return engine.mint(toWalletId, amountCC, memo); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });
}