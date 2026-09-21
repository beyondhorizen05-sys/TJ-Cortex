import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PermissionModal } from './PermissionModal';
import { useUi } from '../store/ui';
import { useAgents } from '../store/agents';
import { useProviders } from '../store/providers';
import { useEconomy } from '../store/economy';
import { useOutbox } from '../store/outbox';

import { AgentsPanel } from '../panels/AgentsPanel';
import { TranscriptPanel } from '../panels/TranscriptPanel';
import { ProvidersPanel } from '../panels/ProvidersPanel';
import { RecipesPanel } from '../panels/RecipesPanel';
import { SkillsPanel } from '../panels/SkillsPanel';
import { McpPanel } from '../panels/McpPanel';
import { OutboxPanel } from '../panels/OutboxPanel';
import { LedgerPanel } from '../panels/LedgerPanel';
import { ContractsPanel } from '../panels/ContractsPanel';
import { BountiesPanel } from '../panels/BountiesPanel';
import { GuildsPanel } from '../panels/GuildsPanel';
import { WalletPanel } from '../panels/WalletPanel';
import { ReputationPanel } from '../panels/ReputationPanel';
import { CostPanel } from '../panels/CostPanel';
import { SettingsPanel } from '../panels/SettingsPanel';
import { VillageHost } from '../panels/VillageHost';

const PANELS = {
  agents: AgentsPanel,
  transcript: TranscriptPanel,
  providers: ProvidersPanel,
  recipes: RecipesPanel,
  skills: SkillsPanel,
  mcp: McpPanel,
  outbox: OutboxPanel,
  ledger: LedgerPanel,
  contracts: ContractsPanel,
  bounties: BountiesPanel,
  guilds: GuildsPanel,
  wallet: WalletPanel,
  reputation: ReputationPanel,
  cost: CostPanel,
  settings: SettingsPanel,
  village: VillageHost,
} as const;

export function AppShell() {
  const panel = useUi((s) => s.panel);
  const Panel = PANELS[panel];

  useEffect(() => {
    useAgents.getState().load().catch(console.error);
    useProviders.getState().load().catch(console.error);
    useEconomy.getState().load().catch(console.error);
    useOutbox.getState().load().catch(console.error);
  }, []);

  return (
    <div className="relative z-10 h-full flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-h-0 m-3 glass-panel overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={panel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full"
            >
              <Panel />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <PermissionModal />
    </div>
  );
}