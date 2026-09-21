import type { EconomyStore } from '@tj-cortex/economy';
import type { Wallet, LedgerEntry, Contract, Bounty, Guild, Reputation } from '@tj-cortex/shared';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  wallets as walletsTbl,
  ledgerEntries as ledgerTbl,
  contracts as contractsTbl,
  bounties as bountiesTbl,
  guilds as guildsTbl,
  reputations as repsTbl,
} from '../db/schema.js';

/**
 * Bridge between the economy engine's EconomyStore port and Drizzle. Every
 * mutation is a real DB write. Nothing is stored in memory only.
 */
export class DrizzleEconomyStore implements EconomyStore {
  /* Wallets */
  getWallet(id: string) { return this.walletRowToObj(db.select().from(walletsTbl).where(eq(walletsTbl.id, id)).all()[0]); }
  getWalletByAgent(agentId: string) { return this.walletRowToObj(db.select().from(walletsTbl).where(eq(walletsTbl.agentId, agentId)).all()[0]); }
  listWallets() { return db.select().from(walletsTbl).all().map((r) => this.walletRowToObj(r)!).filter(Boolean); }
  insertWallet(w: Wallet) {
    db.insert(walletsTbl).values({ id: w.id, agentId: w.agentId ?? null, label: w.label, balanceCC: w.balanceCC, escrowCC: w.escrowCC, createdAt: w.createdAt }).run();
  }
  updateWallet(w: Wallet) {
    db.update(walletsTbl).set({ balanceCC: w.balanceCC, escrowCC: w.escrowCC }).where(eq(walletsTbl.id, w.id)).run();
  }

  /* Ledger */
  lastLedgerEntry() {
    const r = db.select().from(ledgerTbl).orderBy(desc(ledgerTbl.ts)).limit(1).all()[0];
    return r ? this.ledgerRowToObj(r) : undefined;
  }
  insertLedgerEntry(e: LedgerEntry) {
    db.insert(ledgerTbl).values({
      id: e.id, ts: e.ts, kind: e.kind, amountCC: e.amountCC,
      fromWalletId: e.fromWalletId ?? null, toWalletId: e.toWalletId ?? null,
      agentId: e.agentId ?? null, refId: e.refId ?? null, memo: e.memo ?? null,
      prevHash: e.prevHash, hash: e.hash, signature: e.signature,
    }).run();
  }
  listLedger(limit: number) { return db.select().from(ledgerTbl).orderBy(desc(ledgerTbl.ts)).limit(limit).all().map((r) => this.ledgerRowToObj(r)); }
  getLedgerEntryByRef(refId: string) {
    const r = db.select().from(ledgerTbl).where(eq(ledgerTbl.refId, refId)).orderBy(desc(ledgerTbl.ts)).limit(1).all()[0];
    return r ? this.ledgerRowToObj(r) : undefined;
  }
  sumSpendForAgentSince(agentId: string, since: number): number {
    const rows = db.select().from(ledgerTbl)
      .where(and(eq(ledgerTbl.agentId, agentId), gte(ledgerTbl.ts, since)))
      .all();
    let sum = 0;
    for (const r of rows) if (r.amountCC > 0) sum += r.amountCC;
    return sum;
  }

  /* Contracts */
  getContract(id: string) { return this.contractRowToObj(db.select().from(contractsTbl).where(eq(contractsTbl.id, id)).all()[0]); }
  listContracts() { return db.select().from(contractsTbl).orderBy(desc(contractsTbl.updatedAt)).all().map((r) => this.contractRowToObj(r)!); }
  insertContract(c: Contract) { this.writeContract(c, true); }
  updateContract(c: Contract) { this.writeContract(c, false); }

  /* Bounties */
  getBounty(id: string) { return this.bountyRowToObj(db.select().from(bountiesTbl).where(eq(bountiesTbl.id, id)).all()[0]); }
  listBounties() { return db.select().from(bountiesTbl).orderBy(desc(bountiesTbl.createdAt)).all().map((r) => this.bountyRowToObj(r)!); }
  insertBounty(b: Bounty) { this.writeBounty(b, true); }
  updateBounty(b: Bounty) { this.writeBounty(b, false); }

  /* Guilds */
  getGuild(id: string) { return this.guildRowToObj(db.select().from(guildsTbl).where(eq(guildsTbl.id, id)).all()[0]); }
  listGuilds() { return db.select().from(guildsTbl).all().map((r) => this.guildRowToObj(r)!); }
  insertGuild(g: Guild) { this.writeGuild(g, true); }
  updateGuild(g: Guild) { this.writeGuild(g, false); }

  /* Reputation */
  getReputation(agentId: string) { return this.repRowToObj(db.select().from(repsTbl).where(eq(repsTbl.agentId, agentId)).all()[0]); }
  listReputations() { return db.select().from(repsTbl).all().map((r) => this.repRowToObj(r)!); }
  upsertReputation(r: Reputation) {
    db.insert(repsTbl).values({
      agentId: r.agentId, score: r.score,
      contractsCompleted: r.contractsCompleted, contractsDisputed: r.contractsDisputed,
      totalEarnedCC: r.totalEarnedCC, totalSpentCC: r.totalSpentCC, updatedAt: r.updatedAt,
    }).onConflictDoUpdate({
      target: repsTbl.agentId,
      set: {
        score: r.score, contractsCompleted: r.contractsCompleted,
        contractsDisputed: r.contractsDisputed, totalEarnedCC: r.totalEarnedCC,
        totalSpentCC: r.totalSpentCC, updatedAt: r.updatedAt,
      },
    }).run();
  }

  /* ---- row converters ---- */
  private walletRowToObj(r: any): Wallet | undefined {
    if (!r) return undefined;
    return { id: r.id, agentId: r.agentId ?? undefined, label: r.label, balanceCC: r.balanceCC, escrowCC: r.escrowCC, createdAt: r.createdAt };
  }
  private ledgerRowToObj(r: any): LedgerEntry {
    return {
      id: r.id, ts: r.ts, kind: r.kind, amountCC: r.amountCC,
      fromWalletId: r.fromWalletId ?? undefined, toWalletId: r.toWalletId ?? undefined,
      agentId: r.agentId ?? undefined, refId: r.refId ?? undefined, memo: r.memo ?? undefined,
      prevHash: r.prevHash, hash: r.hash, signature: r.signature,
    };
  }
  private contractRowToObj(r: any): Contract | undefined {
    if (!r) return undefined;
    return {
      id: r.id, title: r.title, brief: r.brief,
      clientAgentId: r.clientAgentId, workerAgentId: r.workerAgentId ?? undefined,
      amountCC: r.amountCC, status: r.status,
      deliverables: JSON.parse(r.deliverablesJson), escrowWalletId: r.escrowWalletId ?? undefined,
      negotiationLog: JSON.parse(r.negotiationJson),
      createdAt: r.createdAt, updatedAt: r.updatedAt, settledAt: r.settledAt ?? undefined,
    };
  }
  private writeContract(c: Contract, insert: boolean) {
    const values = {
      id: c.id, title: c.title, brief: c.brief,
      clientAgentId: c.clientAgentId, workerAgentId: c.workerAgentId ?? null,
      amountCC: c.amountCC, status: c.status,
      deliverablesJson: JSON.stringify(c.deliverables),
      escrowWalletId: c.escrowWalletId ?? null,
      negotiationJson: JSON.stringify(c.negotiationLog),
      createdAt: c.createdAt, updatedAt: c.updatedAt, settledAt: c.settledAt ?? null,
    };
    if (insert) db.insert(contractsTbl).values(values).run();
    else db.update(contractsTbl).set(values).where(eq(contractsTbl.id, c.id)).run();
  }
  private bountyRowToObj(r: any): Bounty | undefined {
    if (!r) return undefined;
    return {
      id: r.id, title: r.title, brief: r.brief, rewardCC: r.rewardCC,
      postedByAgentId: r.postedByAgentId, claimedByAgentId: r.claimedByAgentId ?? undefined,
      status: r.status, escrowWalletId: r.escrowWalletId ?? undefined,
      createdAt: r.createdAt, expiresAt: r.expiresAt ?? undefined, paidAt: r.paidAt ?? undefined,
    };
  }
  private writeBounty(b: Bounty, insert: boolean) {
    const values = {
      id: b.id, title: b.title, brief: b.brief, rewardCC: b.rewardCC,
      postedByAgentId: b.postedByAgentId, claimedByAgentId: b.claimedByAgentId ?? null,
      status: b.status, escrowWalletId: b.escrowWalletId ?? null,
      createdAt: b.createdAt, expiresAt: b.expiresAt ?? null, paidAt: b.paidAt ?? null,
    };
    if (insert) db.insert(bountiesTbl).values(values).run();
    else db.update(bountiesTbl).set(values).where(eq(bountiesTbl.id, b.id)).run();
  }
  private guildRowToObj(r: any): Guild | undefined {
    if (!r) return undefined;
    return {
      id: r.id, name: r.name, purpose: r.purpose, emblemSeed: r.emblemSeed,
      memberAgentIds: JSON.parse(r.memberAgentIdsJson), createdAt: r.createdAt,
    };
  }
  private writeGuild(g: Guild, insert: boolean) {
    const values = {
      id: g.id, name: g.name, purpose: g.purpose, emblemSeed: g.emblemSeed,
      memberAgentIdsJson: JSON.stringify(g.memberAgentIds), createdAt: g.createdAt,
    };
    if (insert) db.insert(guildsTbl).values(values).run();
    else db.update(guildsTbl).set(values).where(eq(guildsTbl.id, g.id)).run();
  }
  private repRowToObj(r: any): Reputation | undefined {
    if (!r) return undefined;
    return {
      agentId: r.agentId, score: r.score,
      contractsCompleted: r.contractsCompleted, contractsDisputed: r.contractsDisputed,
      totalEarnedCC: r.totalEarnedCC, totalSpentCC: r.totalSpentCC, updatedAt: r.updatedAt,
    };
  }
}