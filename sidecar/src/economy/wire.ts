import { EconomyEngine } from '@tj-cortex/economy';
import type { EconomyEvent } from '@tj-cortex/economy';
import { WS_EVENTS } from '@tj-cortex/shared';
import { DrizzleEconomyStore } from './store.js';
import { broadcast } from '../ws.js';
import { getKeychain } from '../keychain.js';
import { logger } from '../logger.js';

const SECRET_KEY = 'tj-cortex.economy.ledger_secret';

let instance: EconomyEngine | null = null;

function emit(event: EconomyEvent) {
  switch (event.type) {
    case 'ledger.entry':      broadcast(WS_EVENTS.LedgerEntry, event.payload); break;
    case 'wallet.updated':    broadcast(WS_EVENTS.WalletUpdated, event.payload); break;
    case 'contract.proposed': broadcast(WS_EVENTS.ContractProposed, event.payload); break;
    case 'contract.signed':   broadcast(WS_EVENTS.ContractSigned, event.payload); break;
    case 'contract.settled':  broadcast(WS_EVENTS.ContractSettled, event.payload); break;
    case 'bounty.posted':     broadcast(WS_EVENTS.BountyPosted, event.payload); break;
    case 'bounty.claimed':    broadcast(WS_EVENTS.BountyClaimed, event.payload); break;
    case 'bounty.paid':       broadcast(WS_EVENTS.BountyPaid, event.payload); break;
    case 'reputation.updated':broadcast(WS_EVENTS.ReputationUpdated, event.payload); break;
    case 'guild.updated':     broadcast(WS_EVENTS.GuildUpdated, event.payload); break;
    case 'error':             broadcast(WS_EVENTS.Error, event.payload); break;
  }
}

/**
 * Get (or lazily build) the singleton EconomyEngine. The local signing secret
 * is stored in the OS keychain so restarts preserve signature verification.
 */
export async function getEconomy(): Promise<EconomyEngine> {
  if (instance) return instance;
  const kc = getKeychain();
  let secret = await kc.get(SECRET_KEY);
  if (!secret) {
    const { newLocalSecret } = await import('@tj-cortex/economy');
    secret = newLocalSecret();
    await kc.set(SECRET_KEY, secret);
    logger.info('economy signing secret created and stored in OS keychain');
  }
  instance = new EconomyEngine(new DrizzleEconomyStore(), emit, secret);
  return instance;
}