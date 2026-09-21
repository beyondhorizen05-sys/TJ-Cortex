import { create } from 'zustand';
import { WS_EVENTS } from '@tj-cortex/shared';
import type { LedgerEntry, Guild } from '@tj-cortex/shared';
import { on } from '../lib/wsBridge';

interface VillageEconomyState {
  /** Timestamp of the most recent ledger entry; drives the Trade Exchange beacon. */
  lastLedgerAt: number | null;
  /** Most recent OUTBOX delivery; drives the OUTBOX beacon. */
  lastDeliveryAt: number | null;
  /** Total CC across all wallets; drives the Myelin Bank vault ring. */
  totalBalanceCC: number;
  /** Number of guilds; drives the Guild Hall banners. */
  guildCount: number;

  setLastLedger: (e: LedgerEntry) => void;
  setLastDelivery: (at: number) => void;
  setBalances: (totalCC: number) => void;
  setGuildCount: (n: number) => void;
  bind: () => () => void;
}

export const useVillageEconomy = create<VillageEconomyState>((set) => ({
  lastLedgerAt: null,
  lastDeliveryAt: null,
  totalBalanceCC: 0,
  guildCount: 0,
  setLastLedger: (e) => set({ lastLedgerAt: e.ts }),
  setLastDelivery: (at) => set({ lastDeliveryAt: at }),
  setBalances: (totalCC) => set({ totalBalanceCC: totalCC }),
  setGuildCount: (n) => set({ guildCount: n }),

  bind: () => {
    const offs: Array<() => void> = [];
    offs.push(on(WS_EVENTS.LedgerEntry, (e: LedgerEntry) => useVillageEconomy.getState().setLastLedger(e)));
    offs.push(on(WS_EVENTS.OutboxUpdated, (item: any) => useVillageEconomy.getState().setLastDelivery(item.createdAt)));
    offs.push(on(WS_EVENTS.WalletUpdated, () => {
      // The sidecar will emit an aggregate through a later event; for now,
      // recompute lazily when the UI hands us balances via setBalances.
    }));
    offs.push(on(WS_EVENTS.GuildUpdated, (_g: Guild) => {
      useVillageEconomy.setState((s) => ({ guildCount: s.guildCount + 1 }));
    }));
    return () => { for (const off of offs) off(); };
  },
}));