import { useEffect, useState } from 'react';
import { Plus, UserPlus, Users } from 'lucide-react';
import { useAgents } from '../store/agents';
import { AgentCard } from '../components/AgentCard';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { useUi } from '../store/ui';

type CrewClassSummary = { id: string; name: string; summary: string; role: string; tier: 'builtin' | 'archive'; suggestedTools: string[] };

export function AgentsPanel() {
  const agents = useAgents((s) => s.agents);
  const selectedId = useAgents((s) => s.selectedId);
  const select = useAgents((s) => s.select);
  const create = useAgents((s) => s.create);
  const setPanel = useUi((s) => s.setPanel);
  const [creating, setCreating] = useState(false);
  const [recruiting, setRecruiting] = useState(false);
  const [name, setName] = useState('');
  const [crew, setCrew] = useState<CrewClassSummary[]>([]);
  const [crewClassId, setCrewClassId] = useState('');
  const [crewLoading, setCrewLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!recruiting || crew.length) return;
    setCrewLoading(true);
    api.listCrewClasses()
      .then((catalog) => {
        setCrew(catalog.all);
        setCrewClassId(catalog.builtin[0]?.id ?? catalog.all[0]?.id ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load crew catalog.'))
      .finally(() => setCrewLoading(false));
  }, [recruiting, crew.length]);

  async function handleCreate() {
    if (!name.trim()) return;
    setError('');
    try {
      await create({ name: name.trim() });
      setName('');
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent creation failed.');
    }
  }

  async function handleRecruit() {
    if (!crewClassId) return;
    setError('');
    try {
      await api.recruitCrew(crewClassId, name.trim() || undefined);
      setName('');
      setRecruiting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crew recruitment failed.');
    }
  }

  const selectedClass = crew.find((item) => item.id === crewClassId);

  return (
    <div className="h-full grid grid-rows-[auto,auto,1fr]">
      <div className="flex items-center justify-between p-4 border-b border-glia-gray/15">
        <div>
          <div className="text-h1 font-semibold">Agents</div>
          <div className="text-body-s text-glia-gray">Recruit specialists and manage the persistent crew.</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-2" onClick={() => { setRecruiting((v) => !v); setCreating(false); }}>
            <Users size={16} /> Recruit crew
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => { setCreating((v) => !v); setRecruiting(false); }}>
            <Plus size={16} /> New agent
          </button>
        </div>
      </div>

      {(creating || recruiting) && (
        <div className="p-4 border-b border-glia-gray/15 space-y-3">
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (recruiting ? handleRecruit() : handleCreate())}
              placeholder={recruiting ? 'Optional agent name' : 'Agent name'}
              className="flex-1 bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60"
            />
            {creating && <button className="btn-primary" onClick={handleCreate}>Create</button>}
          </div>

          {recruiting && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-start">
              <select
                value={crewClassId}
                disabled={crewLoading}
                onChange={(e) => setCrewClassId(e.target.value)}
                className="bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none"
              >
                {crew.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role} · {item.tier}</option>)}
              </select>
              <button className="btn-primary flex items-center gap-2" onClick={handleRecruit} disabled={!crewClassId || crewLoading}>
                <UserPlus size={16} /> Recruit
              </button>
              {selectedClass && <p className="md:col-span-2 text-body-s text-glia-gray">{selectedClass.summary}</p>}
            </div>
          )}

          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      )}

      {agents.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={28} />}
          title="No agents yet."
          body="Recruit a specialist or create your first agent."
          action={<button className="btn-primary" onClick={() => setRecruiting(true)}>Recruit your first crew member</button>}
        />
      ) : (
        <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              selected={a.id === selectedId}
              onClick={() => { select(a.id); setPanel('transcript'); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
