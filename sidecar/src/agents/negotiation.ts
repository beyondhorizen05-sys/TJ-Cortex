import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agents as agentsTbl, conversations, messages } from '../db/schema.js';
import { WS_EVENTS } from '@tj-cortex/shared';
import { broadcast } from '../ws.js';
import { logger } from '../logger.js';
import { rawChat } from './runtime.js';
import { getEconomy } from '../economy/wire.js';
import type { ProviderId } from '@tj-cortex/shared';

/**
 * Agent-to-agent contract negotiation. Two agents talk over the provider
 * layer; the exchange is written to a `trade` conversation and the resulting
 * contract is proposed, accepted, and settled in the economy engine.
 *
 * The user sees this in the Trade Exchange panel and the village Trade
 * Exchange beacon pulses on each ledger event.
 */

export interface NegotiationInput {
  clientAgentId: string;
  workerAgentId: string;
  topic: string;
  brief: string;
  maxRounds?: number;
  startingOfferCC?: number;
}

export async function negotiate(input: NegotiationInput) {
  const client = db.select().from(agentsTbl).where(eq(agentsTbl.id, input.clientAgentId)).all()[0];
  const worker = db.select().from(agentsTbl).where(eq(agentsTbl.id, input.workerAgentId)).all()[0];
  if (!client || !worker) throw new Error('one or both agents not found');

  const engine = await getEconomy();

  // Create a trade conversation for the transcript.
  const convId = randomUUID();
  const now = Date.now();
  db.insert(conversations).values({
    id: convId, title: `Trade · ${input.topic}`, kind: 'trade',
    agentIdsJson: JSON.stringify([client.id, worker.id]),
    createdAt: now, updatedAt: now,
  }).run();

  broadcast(WS_EVENTS.AgentStateChanged, { agentId: client.id, state: 'trading', location: 'trade_exchange' });
  broadcast(WS_EVENTS.AgentStateChanged, { agentId: worker.id, state: 'trading', location: 'trade_exchange' });

  const maxRounds = input.maxRounds ?? 3;
  let offerCC = input.startingOfferCC ?? 10;
  const transcript: Array<{ from: string; text: string }> = [];

  for (let round = 0; round < maxRounds; round++) {
    // Client proposes.
    const clientPrompt = `You are ${client.name}. You want to hire ${worker.name} for: "${input.topic}". Brief: ${input.brief}. Current offer: ${offerCC.toFixed(2)} CC. Reply with a single short sentence: either accept, counter with a new CC number (format "COUNTER <number>"), or decline (say "DECLINE").`;
    const clientReply = await rawChat(client.providerId as ProviderId, client.modelId, [
      { role: 'system', content: client.systemPrompt || `You are ${client.name}, an agent in TJ-Cortex.` },
      { role: 'user', content: clientPrompt },
    ]);
    transcript.push({ from: client.name, text: clientReply.text });
    appendTranscript(convId, client.id, clientReply.text);

    const clientDecision = parseDecision(clientReply.text);

    // Worker responds.
    const workerPrompt = `You are ${worker.name}. ${client.name} offers ${offerCC.toFixed(2)} CC for: "${input.topic}". Reply with a single short sentence: accept, counter ("COUNTER <number>"), or decline ("DECLINE").`;
    const workerReply = await rawChat(worker.providerId as ProviderId, worker.modelId, [
      { role: 'system', content: worker.systemPrompt || `You are ${worker.name}, an agent in TJ-Cortex.` },
      { role: 'user', content: workerPrompt },
    ]);
    transcript.push({ from: worker.name, text: workerReply.text });
    appendTranscript(convId, worker.id, workerReply.text);

    const workerDecision = parseDecision(workerReply.text);

    if (workerDecision.kind === 'accept') break;
    if (workerDecision.kind === 'counter' && workerDecision.value) {
      offerCC = workerDecision.value;
      continue;
    }
    if (workerDecision.kind === 'decline' || clientDecision.kind === 'decline') {
      logger.info({ topic: input.topic }, 'negotiation declined');
      broadcast(WS_EVENTS.AgentStateChanged, { agentId: client.id, state: 'idle', location: 'dendrite_diner' });
      broadcast(WS_EVENTS.AgentStateChanged, { agentId: worker.id, state: 'idle', location: 'dendrite_diner' });
      return { accepted: false, transcript };
    }
  }

  // Propose the contract at the final agreed number, then accept + settle.
  const contract = engine.proposeContract({
    title: input.topic,
    brief: input.brief,
    clientAgentId: client.id,
    amountCC: offerCC,
    deliverables: ['deliverable.md'],
  });

  // Log the negotiation transcript onto the contract.
  for (const line of transcript) {
    engine.logNegotiation(contract.id, client.id, `${line.from}: ${line.text}`);
  }

  // Fetch the freshly persisted contract row's client agent boundaries.
  const clientAgent = { id: client.id, boundaries: JSON.parse(client.boundariesJson || '{}') };
  try {
    engine.acceptContract({
      contractId: contract.id,
      workerAgentId: worker.id,
      clientAgent: clientAgent as any,
      consentGranted: false,
    });
  } catch (e) {
    logger.warn({ err: (e as Error).message, contract: contract.id }, 'negotiation accepted but escrow blocked');
    broadcast(WS_EVENTS.AgentStateChanged, { agentId: client.id, state: 'blocked', location: 'soma_plaza' });
    broadcast(WS_EVENTS.AgentStateChanged, { agentId: worker.id, state: 'blocked', location: 'soma_plaza' });
    return { accepted: false, blocked: true, contract, transcript };
  }

  // Worker "delivers" in the same turn for the demo path — real deliverables
  // go through the OUTBOX in a fuller run. This keeps the loop self-contained.
  engine.startContract(contract.id);
  engine.deliverContract(contract.id, 'Delivered.');
  engine.settleContract(contract.id);

  broadcast(WS_EVENTS.AgentStateChanged, { agentId: client.id, state: 'idle', location: 'dendrite_diner' });
  broadcast(WS_EVENTS.AgentStateChanged, { agentId: worker.id, state: 'earning', location: 'trade_exchange' });

  return { accepted: true, contract, transcript };
}

function appendTranscript(convId: string, agentId: string, text: string) {
  db.insert(messages).values({
    id: randomUUID(),
    conversationId: convId,
    kind: 'agent.to_agent',
    fromAgentId: agentId,
    role: 'assistant',
    content: text,
    createdAt: Date.now(),
  }).run();
  broadcast(WS_EVENTS.MessageAdded, { conversationId: convId, fromAgentId: agentId, content: text, createdAt: Date.now() });
}

function parseDecision(text: string): { kind: 'accept' | 'counter' | 'decline' | 'unknown'; value?: number } {
  const upper = text.toUpperCase();
  if (upper.includes('DECLINE')) return { kind: 'decline' };
  const m = upper.match(/COUNTER\s+([0-9]+(?:\.[0-9]+)?)/);
  if (m) return { kind: 'counter', value: Number(m[1]) };
  if (upper.includes('ACCEPT') || upper.includes('AGREE') || upper.includes('DEAL')) return { kind: 'accept' };
  return { kind: 'unknown' };
}