import { motion } from 'framer-motion';
import type { Agent } from '@tj-cortex/shared';
import { StateChip } from './StateChip';
import { LOCATION_BRAND } from '@tj-cortex/shared';
import { cn } from '../lib/format';

export function AgentCard({
  agent, selected, onClick,
}: { agent: Agent; selected?: boolean; onClick?: () => void }) {
  const initial = agent.name.trim().charAt(0).toUpperCase();
  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ y: -1 }}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-colors duration-150',
        selected
          ? 'border-cortex-violet/60 bg-cortex-violet/10'
          : 'border-glia-gray/20 hover:border-glia-gray/40 hover:bg-white/5',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full grid place-items-center text-body-l font-semibold"
          style={{
            background: `linear-gradient(135deg, ${agent.avatar?.accentColor ?? '#6C4CF1'} 0%, ${agent.avatar?.glowColor ?? '#22D3EE'} 100%)`,
            color: '#0B0B14',
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-body-l font-semibold truncate">{agent.name}</span>
            <StateChip state={agent.state} />
          </div>
          <div className="text-body-s text-glia-gray truncate">
            {agent.role} · {LOCATION_BRAND[agent.location] ?? agent.location}
          </div>
        </div>
      </div>
    </motion.button>
  );
}