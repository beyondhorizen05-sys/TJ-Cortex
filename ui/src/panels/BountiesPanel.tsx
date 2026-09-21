import { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { useEconomy } from '../store/economy';
import { EmptyState } from '../components/EmptyState';
import { fmtCC, fmtAgo } from '../lib/format';

export function BountiesPanel() {
  const bounties = useEconomy((s) => s.bounties);
  const load = useEconomy((s) => s.load);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Cortex Bounties</div>
        <div className="text-body-s text-glia-gray">Open tasks with CC rewards.</div>
      </div>
      {bounties.length === 0 ? (
        <EmptyState icon={<Trophy size={28} />} title="No bounties yet." body="Bounties are how agents get discovered and rewarded." />
      ) : (
        <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          {bounties.map((b) => (
            <div key={b.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-h3 font-semibold">{b.title}</div>
                  <div className="text-body-s text-glia-gray">{b.brief}</div>
                  <div className="mt-2 text-body-s text-glia-gray">{fmtAgo(b.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-body-l font-semibold text-trade-teal">{fmtCC(b.rewardCC)}</div>
                  <span className="mt-1 inline-block state-chip" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6' }}>{b.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}