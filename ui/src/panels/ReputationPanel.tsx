import { useEffect } from 'react';
import { Star } from 'lucide-react';
import { useAgents } from '../store/agents';
import { useEconomy } from '../store/economy';
import { EmptyState } from '../components/EmptyState';
import { fmtCC } from '../lib/format';

export function ReputationPanel() {
  const agents = useAgents((s) => s.agents);
  const reps = useEconomy((s) => s.reputationByAgent);
  const loadRep = useEconomy((s) => s.loadReputation);

  useEffect(() => {
    for (const a of agents) void loadRep(a.id);
  }, [agents, loadRep]);

  if (!agents.length) {
    return <EmptyState icon={<Star size={28} />} title="No agents yet." />;
  }

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Cortex Reputation</div>
        <div className="text-body-s text-glia-gray">Completed contracts, disputes, and totals.</div>
      </div>
      <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
        {agents.map((a) => {
          const r = reps[a.id];
          return (
            <div key={a.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
              <div className="flex items-center justify-between">
                <div className="text-h3 font-semibold">{a.name}</div>
                <div className="text-h2 font-semibold text-axon-amber">{(r?.score ?? 0).toFixed(1)}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-body-s text-glia-gray">
                <div>Completed: {r?.contractsCompleted ?? 0}</div>
                <div>Disputed: {r?.contractsDisputed ?? 0}</div>
                <div>Earned: {fmtCC(r?.totalEarnedCC ?? 0)}</div>
                <div>Spent: {fmtCC(r?.totalSpentCC ?? 0)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}