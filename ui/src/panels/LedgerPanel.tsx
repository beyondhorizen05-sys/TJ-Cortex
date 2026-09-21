import { useEffect } from 'react';
import { ScrollText, ArrowRight } from 'lucide-react';
import { useEconomy } from '../store/economy';
import { EmptyState } from '../components/EmptyState';
import { fmtCC, fmtAgo } from '../lib/format';

export function LedgerPanel() {
  const ledger = useEconomy((s) => s.ledger);
  const load = useEconomy((s) => s.load);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Cortex Ledger</div>
        <div className="text-body-s text-glia-gray">Every transaction is signed and auditable.</div>
      </div>

      {ledger.length === 0 ? (
        <EmptyState icon={<ScrollText size={28} />} title="No entries yet."
          body="Every transfer, escrow, and payout is written here — hash-chained." />
      ) : (
        <div className="overflow-y-auto">
          <table className="w-full text-body-m">
            <thead className="sticky top-0 bg-[#101020]/95 backdrop-blur border-b border-glia-gray/15 text-glia-gray">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Kind</th>
                <th className="px-4 py-2 font-medium">From → To</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium">Memo</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id} className="border-b border-glia-gray/10 hover:bg-white/5">
                  <td className="px-4 py-2 text-glia-gray whitespace-nowrap">{fmtAgo(e.ts)}</td>
                  <td className="px-4 py-2">
                    <span className="state-chip" style={{ background: 'rgba(20,184,166,0.15)', color: '#14B8A6' }}>{e.kind}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-body-s text-glia-gray whitespace-nowrap">
                    {(e.fromWalletId ?? '—').slice(0, 6)} <ArrowRight size={10} className="inline" /> {(e.toWalletId ?? '—').slice(0, 6)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono" style={{ color: e.amountCC >= 0 ? '#34D399' : '#FB7185' }}>
                    {fmtCC(e.amountCC, { sign: true })}
                  </td>
                  <td className="px-4 py-2 text-glia-gray truncate max-w-[260px]">{e.memo ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}