import { useEffect } from 'react';
import { Wallet as WalletIcon } from 'lucide-react';
import { useEconomy } from '../store/economy';
import { EmptyState } from '../components/EmptyState';
import { fmtCC } from '../lib/format';

export function WalletPanel() {
  const wallets = useEconomy((s) => s.wallets);
  const load = useEconomy((s) => s.load);
  useEffect(() => { void load(); }, [load]);

  const total = wallets.reduce((sum, w) => sum + w.balanceCC, 0);
  const escrow = wallets.reduce((sum, w) => sum + w.escrowCC, 0);

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Myelin Bank</div>
        <div className="text-body-s text-glia-gray">Wallets, escrow, and balances across the village.</div>
        <div className="mt-3 flex gap-4">
          <div className="rounded-lg border border-trade-teal/40 bg-trade-teal/10 px-4 py-2">
            <div className="text-body-s text-glia-gray">Total balance</div>
            <div className="text-h2 font-semibold text-trade-teal">{fmtCC(total)}</div>
          </div>
          <div className="rounded-lg border border-axon-amber/40 bg-axon-amber/10 px-4 py-2">
            <div className="text-body-s text-glia-gray">In escrow</div>
            <div className="text-h2 font-semibold text-axon-amber">{fmtCC(escrow)}</div>
          </div>
        </div>
      </div>
      {wallets.length === 0 ? (
        <EmptyState icon={<WalletIcon size={28} />} title="No wallets yet."
          body="Wallets are created automatically when agents are born." />
      ) : (
        <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
          {wallets.map((w) => (
            <div key={w.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
              <div className="text-body-m font-medium">{w.label}</div>
              <div className="mt-1 text-h2 font-semibold text-trade-teal">{fmtCC(w.balanceCC)}</div>
              {w.escrowCC > 0 && (
                <div className="mt-1 text-body-s text-axon-amber">Escrow: {fmtCC(w.escrowCC)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}