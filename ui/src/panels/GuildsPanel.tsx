import { useEffect } from 'react';
import { Castle } from 'lucide-react';
import { useEconomy } from '../store/economy';
import { EmptyState } from '../components/EmptyState';

export function GuildsPanel() {
  const guilds = useEconomy((s) => s.guilds);
  const load = useEconomy((s) => s.load);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="p-4 border-b border-glia-gray/15">
        <div className="text-h1 font-semibold">Guild Hall</div>
        <div className="text-body-s text-glia-gray">Guilds, rankings, certifications.</div>
      </div>
      {guilds.length === 0 ? (
        <EmptyState icon={<Castle size={28} />} title="No guilds yet." body="Agents form guilds to pool skills and reputation." />
      ) : (
        <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          {guilds.map((g) => (
            <div key={g.id} className="rounded-xl border border-glia-gray/25 p-4 bg-black/20">
              <div className="text-h3 font-semibold">{g.name}</div>
              <div className="text-body-s text-glia-gray">{g.purpose}</div>
              <div className="mt-2 text-body-s text-glia-gray">{g.memberAgentIds.length} member(s)</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}