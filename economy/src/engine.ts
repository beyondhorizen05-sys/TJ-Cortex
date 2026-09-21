import type { Agent } from '@tj-cortex/shared';
import type { EconomyStore, EconomyEmit, SpendRequest } from './types.js';
import * as ledger from './ledger.js';
import * as wallets from './wallets.js';
import * as contracts from './contracts.js';
import * as bounties from './bounties.js';
import * as guilds from './guilds.js';
import * as reputation from './reputation.js';
import { check } from './boundaries.js';
import { newLocalSecret, verifySignature } from './signer.js';

/**
 * The economy engine. A thin façade over the primitives, holding the local
 * signing secret and the storage/emit ports. The sidecar constructs one and
 * hands it to the routes and the negotiation orchestrator.
 */
export class EconomyEngine {
  private secret: string;

  constructor(
    public store: EconomyStore,
    public emit: EconomyEmit,
    secret?: string,
  ) {
    this.secret = secret ?? newLocalSecret();
  }

  /* Wallets */
  treasury() { return wallets.ensureTreasury(this.store); }
  agentWallet(agentId: string, label: string) { return wallets.ensureAgentWallet(this.store, agentId, label); }
  mint(toWalletId: string, amountCC: number, memo: string) { return wallets.mint(this.store, this.secret, toWalletId, amountCC, memo); }
  transfer(from: string, to: string, amountCC: number, memo?: string, refId?: string) {
    return wallets.transfer(this.store, this.secret, from, to, amountCC, memo, refId);
  }

  /* Boundaries */
  canSpend(agent: Pick<Agent, 'id' | 'boundaries'>, req: SpendRequest, consentGranted: boolean) {
    return check(this.store, agent, req, consentGranted);
  }

  /* Contracts */
  proposeContract(input: contracts.ProposeInput) { return contracts.propose(this.store, this.emit, input); }
  acceptContract(input: contracts.AcceptInput) { return contracts.accept(this.store, this.emit, this.secret, input); }
  startContract(id: string) { return contracts.start(this.store, this.emit, id); }
  deliverContract(id: string, note?: string) { return contracts.deliver(this.store, this.emit, id, note); }
  settleContract(id: string) { return contracts.settle(this.store, this.emit, this.secret, id); }
  cancelContract(id: string, reason: string) { return contracts.cancel(this.store, this.emit, this.secret, id, reason); }
  logNegotiation(id: string, fromAgentId: string, text: string) {
    return contracts.logNegotiation(this.store, this.emit, id, fromAgentId, text);
  }

  /* Bounties */
  postBounty(input: bounties.PostBountyInput) { return bounties.post(this.store, this.emit, this.secret, input); }
  claimBounty(id: string, agentId: string) { return bounties.claim(this.store, this.emit, id, agentId); }
  submitBounty(id: string) { return bounties.submit(this.store, this.emit, id); }
  payBounty(id: string) { return bounties.pay(this.store, this.emit, this.secret, id); }

  /* Guilds */
  createGuild(input: guilds.CreateGuildInput) { return guilds.create(this.store, this.emit, input); }
  joinGuild(id: string, agentId: string) { return guilds.join(this.store, this.emit, id, agentId); }
  leaveGuild(id: string, agentId: string) { return guilds.leave(this.store, this.emit, id, agentId); }

  /* Reputation */
  ensureRep(agentId: string) { return reputation.ensure(this.store, agentId); }
  recordDispute(agentId: string) { return reputation.recordDispute(this.store, this.emit, agentId); }
  recordEarned(agentId: string, cc: number) { return reputation.recordEarned(this.store, this.emit, agentId, cc); }
  recordSpent(agentId: string, cc: number) { return reputation.recordSpent(this.store, this.emit, agentId, cc); }

  /* Audit */
  audit() { return ledger.audit(this.store, this.secret); }
}