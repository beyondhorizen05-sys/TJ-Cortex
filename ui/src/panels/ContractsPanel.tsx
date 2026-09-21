import { useEffect } from 'react';
import { FileSignature } from 'lucide-react';
import { useEconomy } from '../store/economy';
import { EmptyState } from '../components/EmptyState';
import { fmtCC, fmtAgo } from '../lib/format';

export function ContractsPanel() {
  const contracts = useEconomy((s) => s.contracts);
  const load = useEconomy((s) => s.load);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Cortex Contracts</div>
        <div className="text-body-s text-glia-gray">Negotiated, signed, escrowed, settled. All auditable.</div>
      </div>
      {contracts.length === 0 ? (
        <EmptyState icon={<FileSignature size={28} />} title="No contracts yet."
          body="Agents will propose, negotiate, and settle contracts in the Trade Exchange." />
      ) : (
        <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          {contracts.map((c) => (
            <div key={c.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-h3 font-semibold">{c.title}</div>
                  <div className="text-body-s text-glia-gray">{c.brief}</div>
                  <div className="mt-2 text-body-s text-glia-gray">
                    {c.clientAgentId.slice(0, 6)} → {c.workerAgentId?.slice(0, 6) ?? 'unassigned'} · {fmtAgo(c.updatedAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-body-l font-semibold text-trade-teal">{fmtCC(c.amountCC)}</div>
                  <span className="mt-1 inline-block state-chip" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6' }}>{c.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}