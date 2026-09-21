import type { LedgerEntry, Wallet, Contract, Bounty, Guild, Reputation } from '@tj-cortex/shared';

/**
 * Storage port. The economy engine never imports a DB directly; the sidecar
 * passes an implementation of this interface. This keeps the engine unit-
 * testable and makes the "real, not simulated" guarantee explicit: the store
 * is the source of truth.
 */
export interface EconomyStore {
  /* Wallets */
  getWallet(id: string): Wallet | undefined;
  getWalletByAgent(agentId: string): Wallet | undefined;
  listWallets(): Wallet[];
  insertWallet(w: Wallet): void;
  updateWallet(w: Wallet): void;

  /* Ledger */
  lastLedgerEntry(): LedgerEntry | undefined;
  insertLedgerEntry(e: LedgerEntry): void;
  listLedger(limit: number): LedgerEntry[];
  getLedgerEntryByRef(refId: string): LedgerEntry | undefined;
  sumSpendForAgentSince(agentId: string, since: number): number;

  /* Contracts */
  getContract(id: string): Contract | undefined;
  listContracts(): Contract[];
  insertContract(c: Contract): void;
  updateContract(c: Contract): void;

  /* Bounties */
  getBounty(id: string): Bounty | undefined;
  listBounties(): Bounty[];
  insertBounty(b: Bounty): void;
  updateBounty(b: Bounty): void;

  /* Guilds */
  getGuild(id: string): Guild | undefined;
  listGuilds(): Guild[];
  insertGuild(g: Guild): void;
  updateGuild(g: Guild): void;

  /* Reputation */
  getReputation(agentId: string): Reputation | undefined;
  listReputations(): Reputation[];
  upsertReputation(r: Reputation): void;
}

/** Events the economy engine emits; the sidecar translates them to WS. */
export type EconomyEvent =
  | { type: 'ledger.entry'; payload: LedgerEntry }
  | { type: 'wallet.updated'; payload: Wallet }
  | { type: 'contract.proposed'; payload: Contract }
  | { type: 'contract.signed'; payload: Contract }
  | { type: 'contract.settled'; payload: Contract }
  | { type: 'bounty.posted'; payload: Bounty }
  | { type: 'bounty.claimed'; payload: Bounty }
  | { type: 'bounty.paid'; payload: Bounty }
  | { type: 'reputation.updated'; payload: Reputation }
  | { type: 'guild.updated'; payload: Guild }
  | { type: 'error'; payload: { message: string; code?: string } };

export type EconomyEmit = (event: EconomyEvent) => void;

/** Boundary settings an agent must satisfy before any spend. */
export interface SpendRequest {
  agentId: string;
  amountCC: number;
  kind: 'contract_escrow' | 'bounty_escrow' | 'transfer' | 'external_transfer';
  refId?: string;
  reason: string;
}