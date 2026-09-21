import { create } from 'zustand';
import type { LedgerEntry, Wallet, Contract, Bounty, Guild, Reputation } from '@tj-cortex/shared';
import { api } from '../lib/api';
import { on, WS } from '../lib/ws';
import { sound } from '../lib/sound';

interface EconomyState {
  wallets: Wallet[];
  ledger: LedgerEntry[];
  contracts: Contract[];
  bounties: Bounty[];
  guilds: Guild[];
  reputationByAgent: Record<string, Reputation>;
  load: () => Promise<void>;
  loadReputation: (agentId: string) => Promise<void>;
}

export const useEconomy = create<EconomyState>((set, get) => ({
  wallets: [],
  ledger: [],
  contracts: [],
  bounties: [],
  guilds: [],
  reputationByAgent: {},
  load: async () => {
    const [wallets, ledger, contracts, bounties, guilds] = await Promise.all([
      api.listWallets(), api.listLedger(), api.listContracts(), api.listBounties(), api.listGuilds(),
    ]);
    set({ wallets, ledger, contracts, bounties, guilds });
  },
  loadReputation: async (agentId) => {
    try {
      const r = await api.getReputation(agentId);
      set({ reputationByAgent: { ...get().reputationByAgent, [agentId]: r } });
    } catch { /* ignore 404 */ }
  },
}));

on(WS.LedgerEntry, (e: LedgerEntry) => {
  const s = useEconomy.getState();
  if (s.ledger.find((x) => x.id === e.id)) return;
  sound.coin();
  useEconomy.setState({ ledger: [e, ...s.ledger] });
});

on(WS.WalletUpdated, (w: Wallet) => {
  const s = useEconomy.getState();
  useEconomy.setState({
    wallets: s.wallets.map((x) => (x.id === w.id ? w : x)),
  });
});

on(WS.ContractProposed, (c: Contract) => {
  const s = useEconomy.getState();
  useEconomy.setState({ contracts: [c, ...s.contracts.filter((x) => x.id !== c.id)] });
});
on(WS.ContractSigned, (c: Contract) => {
  useEconomy.setState({ contracts: useEconomy.getState().contracts.map((x) => (x.id === c.id ? c : x)) });
});
on(WS.ContractSettled, (c: Contract) => {
  useEconomy.setState({ contracts: useEconomy.getState().contracts.map((x) => (x.id === c.id ? c : x)) });
});
on(WS.BountyPosted, (b: Bounty) => {
  useEconomy.setState({ bounties: [b, ...useEconomy.getState().bounties.filter((x) => x.id !== b.id)] });
});