import { useEffect } from 'react';
import { VillageMount } from '../../../village/src/VillageMount';
import { useAgents } from '../store/agents';
import { useVillage } from '@tj-cortex/village';
import { useVillageEconomy } from '../../../village/src/state/economyStore';
import { useEconomy } from '../store/economy';
import { on } from '../lib/ws';

export function VillageHost() {
  const agents = useAgents((s) => s.agents);
  const wallets = useEconomy((s) => s.wallets);
  const guilds = useEconomy((s) => s.guilds);

  useEffect(() => {
    (window as any).__tj_cortex_ws__ = { on };
  }, []);

  useEffect(() => {
    useVillage.getState().setAgents(agents);
  }, [agents]);

  useEffect(() => {
    const total = wallets.reduce((s, w) => s + w.balanceCC, 0);
    useVillageEconomy.getState().setBalances(total);
  }, [wallets]);

  useEffect(() => {
    useVillageEconomy.getState().setGuildCount(guilds.length);
  }, [guilds]);

  return (
    <div className="h-full w-full overflow-hidden relative">
      <div className="absolute z-10 top-3 left-3 pointer-events-none">
        <div className="glass-panel px-3 py-2 text-body-s text-glia-gray">
          The Cortex Village · Working → Node · Idle → Dendrite Diner · Meeting → Synapse Hall · Trading → Trade Exchange
        </div>
      </div>
      <VillageMount />
    </div>
  );
}