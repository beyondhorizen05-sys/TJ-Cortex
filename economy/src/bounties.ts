import { randomUUID } from 'node:crypto';
import type { Bounty } from '@tj-cortex/shared';
import type { Agent } from '@tj-cortex/shared';
import { roundCC } from './units.js';
import type { EconomyStore, EconomyEmit } from './types.js';
import { createEscrowWallet, moveToEscrow, releaseEscrow } from './wallets.js';
import { check } from './boundaries.js';

/**
 * Cortex Bounties.
 *
 * A bounty is a small, open task with a CC reward. The poster funds escrow at
 * `post`. A claimer accepts it and submits a deliverable (via the OUTBOX); on
 * `pay`, escrow releases to the claimer.
 */

export interface PostBountyInput {
  title: string;
  brief: string;
  rewardCC: number;
  postedByAgent: Pick<Agent, 'id' | 'boundaries'>;
  consentGranted?: boolean;
  expiresAt?: number;
}

export function post(
  store: EconomyStore,
  emit: EconomyEmit,
  secret: string,
  input: PostBountyInput,
): Bounty {
  const reward = roundCC(input.rewardCC);
  if (reward <= 0) throw new Error('reward must be positive');

  const decision = check(
    store,
    input.postedByAgent,
    {
      agentId: input.postedByAgent.id,
      amountCC: reward,
      kind: 'bounty_escrow',
      reason: `Bounty: ${input.title}`,
    },
    input.consentGranted ?? false,
  );
  if (!decision.allowed) throw new Error(`bounty blocked by boundaries: ${decision.reason}`);

  const now = Date.now();
  const id = randomUUID();
  const escrow = createEscrowWallet(store, `Bounty escrow · ${input.title}`);
  const posterWallet = store.getWalletByAgent(input.postedByAgent.id);
  if (!posterWallet) throw new Error('poster wallet not found');
  moveToEscrow(store, secret, posterWallet.id, escrow.id, reward, id, `Escrow for bounty ${input.title}`);

  const b: Bounty = {
    id,
    title: input.title,
    brief: input.brief,
    rewardCC: reward,
    postedByAgentId: input.postedByAgent.id,
    status: 'open',
    escrowWalletId: escrow.id,
    createdAt: now,
    expiresAt: input.expiresAt,
  };
  store.insertBounty(b);
  emit({ type: 'bounty.posted', payload: b });
  return b;
}

export function claim(
  store: EconomyStore,
  emit: EconomyEmit,
  bountyId: string,
  claimerAgentId: string,
): Bounty {
  const b = store.getBounty(bountyId);
  if (!b) throw new Error('bounty not found');
  if (b.status !== 'open') throw new Error(`cannot claim bounty in status ${b.status}`);
  const next: Bounty = { ...b, status: 'claimed', claimedByAgentId: claimerAgentId };
  store.updateBounty(next);
  emit({ type: 'bounty.claimed', payload: next });
  return next;
}

export function submit(
  store: EconomyStore,
  emit: EconomyEmit,
  bountyId: string,
): Bounty {
  const b = store.getBounty(bountyId);
  if (!b) throw new Error('bounty not found');
  if (b.status !== 'claimed') throw new Error(`cannot submit bounty in status ${b.status}`);
  const next: Bounty = { ...b, status: 'submitted' };
  store.updateBounty(next);
  emit({ type: 'bounty.claimed', payload: next });
  return next;
}

export function pay(
  store: EconomyStore,
  emit: EconomyEmit,
  secret: string,
  bountyId: string,
): Bounty {
  const b = store.getBounty(bountyId);
  if (!b) throw new Error('bounty not found');
  if (!b.escrowWalletId || !b.claimedByAgentId) throw new Error('bounty not payable');
  if (b.status !== 'submitted') throw new Error(`cannot pay bounty in status ${b.status}`);

  const workerWallet = store.getWalletByAgent(b.claimedByAgentId);
  if (!workerWallet) throw new Error('claimer wallet not found');
  releaseEscrow(store, secret, b.escrowWalletId, workerWallet.id, b.rewardCC, b.id, `Bounty payout: ${b.title}`);

  const now = Date.now();
  const next: Bounty = { ...b, status: 'paid', paidAt: now };
  store.updateBounty(next);
  emit({ type: 'bounty.paid', payload: next });

  const rep = store.getReputation(b.claimedByAgentId);
  if (rep) {
    store.upsertReputation({
      ...rep,
      score: Math.min(100, rep.score + 1),
      totalEarnedCC: roundCC(rep.totalEarnedCC + b.rewardCC),
      updatedAt: now,
    });
  }
  return next;
}