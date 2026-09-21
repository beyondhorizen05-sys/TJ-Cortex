import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useAgents } from '../store/agents';
import { EmptyState } from '../components/EmptyState';
import { on, WS } from '../lib/ws';
import { fmtUSD, fmtNum } from '../lib/format';

interface CostRow {
  agentId: string;
  providerId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function CostPanel() {
  const agents = useAgents((s) => s.agents);
  const [rows, setRows] = useState<CostRow[]>([]);

  useEffect(() => {
    const off = on(WS.CostUpdated, (p: any) => {
      setRows((prev) => {
        const i = prev.findIndex((r) => r.agentId === p.agentId && r.model === p.model);
        const next = [...prev];
        if (i >= 0) {
          next[i] = {
            ...next[i]!,
            inputTokens: next[i]!.inputTokens + (p.inputTokens ?? 0),
            outputTokens: next[i]!.outputTokens + (p.outputTokens ?? 0),
            costUsd: next[i]!.costUsd + (p.costUsd ?? 0),
          };
        } else {
          next.unshift({
            agentId: p.agentId,
            providerId: p.providerId,
            model: p.model,
            inputTokens: p.inputTokens ?? 0,
            outputTokens: p.outputTokens ?? 0,
            costUsd: p.costUsd ?? 0,
          });
        }
        return next;
      });
    });
    return off;
  }, []);

  const total = rows.reduce((s, r) => s + r.costUsd, 0);
  const freeTierActive = rows.some((r) => r.providerId === 'gemini' && r.costUsd === 0 && r.inputTokens > 0);

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Cost</div>
        <div className="text-body-s text-glia-gray">
          Every token counted. Gemini free tier shows $0. DeepSeek is significantly cheaper than most providers.
        </div>
        <div className="mt-3 flex gap-4">
          <div className="rounded-lg border border-glia-gray/25 bg-black/30 px-4 py-2">
            <div className="text-body-s text-glia-gray">Session total</div>
            <div className="text-h2 font-semibold">{fmtUSD(total)}</div>
          </div>
          {freeTierActive && (
            <div className="rounded-lg border border-dendrite-green/40 bg-dendrite-green/10 px-4 py-2">
              <div className="text-body-s text-dendrite-green">Free tier active</div>
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<DollarSign size={28} />} title="No spend yet this session."
          body="Costs update live as agents work." />
      ) : (
        <div className="overflow-y-auto">
          <table className="w-full text-body-m">
            <thead className="sticky top-0 bg-[#101020]/95 backdrop-blur border-b border-glia-gray/15 text-glia-gray">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Provider · Model</th>
                <th className="px-4 py-2 font-medium text-right">In</th>
                <th className="px-4 py-2 font-medium text-right">Out</th>
                <th className="px-4 py-2 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const agent = agents.find((a) => a.id === r.agentId);
                return (
                  <tr key={i} className="border-b border-glia-gray/10 hover:bg-white/5">
                    <td className="px-4 py-2">{agent?.name ?? r.agentId.slice(0, 6)}</td>
                    <td className="px-4 py-2 font-mono text-body-s">{r.providerId} · {r.model}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtNum(r.inputTokens)}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtNum(r.outputTokens)}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtUSD(r.costUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}