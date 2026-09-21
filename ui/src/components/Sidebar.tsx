import { motion } from 'framer-motion';
import {
  Users, MessageSquare, Cpu, BookOpen, Wrench, Plug, Package, ScrollText,
  FileSignature, Trophy, Castle, Wallet, Star, DollarSign, Settings, Map, Globe2, UserPlus,
} from 'lucide-react';
import { useUi, type PanelId } from '../store/ui';
import { cn } from '../lib/format';

interface NavItem { id: PanelId; label: string; icon: any; }

const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Cortex', items: [
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'crew', label: 'Crew', icon: UserPlus },
    { id: 'transcript', label: 'Transcript', icon: MessageSquare },
    { id: 'village', label: 'The Cortex Village', icon: Map },
    { id: 'openWorld', label: 'Open World', icon: Globe2 },
  ]},
  { group: 'Runtime', items: [
    { id: 'providers', label: 'Providers', icon: Cpu },
    { id: 'recipes', label: 'Recipes', icon: BookOpen },
    { id: 'skills', label: 'Skills', icon: Wrench },
    { id: 'mcp', label: 'MCP', icon: Plug },
    { id: 'outbox', label: 'OUTBOX', icon: Package },
  ]},
  { group: 'Economy', items: [
    { id: 'ledger', label: 'Cortex Ledger', icon: ScrollText },
    { id: 'contracts', label: 'Contracts', icon: FileSignature },
    { id: 'bounties', label: 'Bounties', icon: Trophy },
    { id: 'guilds', label: 'Guild Hall', icon: Castle },
    { id: 'wallet', label: 'Myelin Bank', icon: Wallet },
    { id: 'reputation', label: 'Reputation', icon: Star },
  ]},
  { group: 'System', items: [
    { id: 'cost', label: 'Cost', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]},
];

export function Sidebar() {
  const panel = useUi((s) => s.panel);
  const setPanel = useUi((s) => s.setPanel);

  return (
    <aside className="w-64 shrink-0 glass-panel m-3 mr-0 p-3 flex flex-col gap-4 overflow-y-auto">
      <div className="px-2 pt-1">
        <div className="font-display font-bold text-h3 tracking-tight">
          TJ<span className="text-cortex-cyan">-</span>CORTEX
        </div>
        <div className="mt-1 text-body-s uppercase tracking-[0.3em] text-cortex-cyan">
          Think · Connect · Build · Earn
        </div>
      </div>

      <nav className="flex flex-col gap-4">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="px-2 mb-1 text-body-s uppercase tracking-widest text-glia-gray">
              {g.group}
            </div>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const active = panel === it.id;
                const Icon = it.icon;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => setPanel(it.id)}
                      className={cn(
                        'relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-body-m text-left transition-colors duration-150',
                        active
                          ? 'text-cortex-white bg-cortex-violet/15'
                          : 'text-glia-gray hover:text-cortex-white hover:bg-white/5',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-gradient-cortex"
                        />
                      )}
                      <Icon size={16} strokeWidth={2} />
                      <span>{it.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
