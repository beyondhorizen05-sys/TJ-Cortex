import { z } from 'zod';

export const LedgerEntryKind = z.enum([
  'mint',
  'transfer',
  'contract_escrow',
  'contract_payout',
  'contract_refund',
  'bounty_escrow',
  'bounty_payout',
  'fee',
  'external_deposit',
  'external_withdraw',
]);
export type LedgerEntryKind = z.infer<typeof LedgerEntryKind>;

export const LedgerEntry = z.object({
  id: z.string(),
  ts: z.number(),
  kind: LedgerEntryKind,
  amountCC: z.number(), // positive = credit to `toWalletId`; negative possible for `fromWalletId`
  fromWalletId: z.string().optional(),
  toWalletId: z.string().optional(),
  agentId: z.string().optional(),
  refId: z.string().optional(), // contract/bounty/tx id
  memo: z.string().optional(),
  /** Signature over the canonical entry payload (hash-only in v1). */
  signature: z.string(),
  /** Hash of previous entry in the chain — makes tampering detectable. */
  prevHash: z.string(),
  hash: z.string(),
});
export type LedgerEntry = z.infer<typeof LedgerEntry>;

export const Wallet = z.object({
  id: z.string(),
  agentId: z.string().optional(), // undefined = system treasury
  label: z.string(),
  balanceCC: z.number().default(0),
  escrowCC: z.number().default(0),
  createdAt: z.number(),
});
export type Wallet = z.infer<typeof Wallet>;

export const ContractStatus = z.enum([
  'draft',
  'proposed',
  'accepted',
  'in_progress',
  'delivered',
  'settled',
  'disputed',
  'cancelled',
]);
export type ContractStatus = z.infer<typeof ContractStatus>;

export const Contract = z.object({
  id: z.string(),
  title: z.string(),
  brief: z.string(),
  clientAgentId: z.string(),
  workerAgentId: z.string().optional(),
  amountCC: z.number().nonnegative(),
  status: ContractStatus.default('draft'),
  deliverables: z.array(z.string()).default([]),
  escrowWalletId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  settledAt: z.number().optional(),
  negotiationLog: z.array(
    z.object({ ts: z.number(), from: z.string(), text: z.string() }),
  ).default([]),
});
export type Contract = z.infer<typeof Contract>;

export const BountyStatus = z.enum(['open', 'claimed', 'submitted', 'paid', 'expired']);
export type BountyStatus = z.infer<typeof BountyStatus>;

export const Bounty = z.object({
  id: z.string(),
  title: z.string(),
  brief: z.string(),
  rewardCC: z.number().nonnegative(),
  postedByAgentId: z.string(),
  claimedByAgentId: z.string().optional(),
  status: BountyStatus.default('open'),
  escrowWalletId: z.string().optional(),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
  paidAt: z.number().optional(),
});
export type Bounty = z.infer<typeof Bounty>;

export const Guild = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  emblemSeed: z.string(),
  memberAgentIds: z.array(z.string()).default([]),
  createdAt: z.number(),
});
export type Guild = z.infer<typeof Guild>;

export const Reputation = z.object({
  agentId: z.string(),
  score: z.number().default(0), // 0..100
  contractsCompleted: z.number().int().nonnegative().default(0),
  contractsDisputed: z.number().int().nonnegative().default(0),
  totalEarnedCC: z.number().default(0),
  totalSpentCC: z.number().default(0),
  updatedAt: z.number(),
});
export type Reputation = z.infer<typeof Reputation>;