import { useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { useAgents } from '../store/agents';
import { AgentCard } from '../components/AgentCard';
import { EmptyState } from '../components/EmptyState';
import { useUi } from '../store/ui';

export function AgentsPanel() {
  const agents = useAgents((s) => s.agents);
  const selectedId = useAgents((s) => s.selectedId);
  const select = useAgents((s) => s.select);
  const create = useAgents((s) => s.create);
  const setPanel = useUi((s) => s.setPanel);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  async function handleCreate() {
    if (!name.trim()) return;
    await create({ name: name.trim() });
    setName('');
    setCreating(false);
  }

  return (
    <div className="h-full grid grid-rows-[auto,1fr]">
      <div className="flex items-center justify-between p-4 border-b border-glia-gray/15">
        <div>
          <div className="text-h1 font-semibold">Agents</div>
          <div className="text-body-s text-glia-gray">Every agent lives in The Cortex Village.</div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setCreating((v) => !v)}>
          <Plus size={16} /> New agent
        </button>
      </div>

      {creating && (
        <div className="p-4 border-b border-glia-gray/15 flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Agent name"
            className="flex-1 bg-black/30 border border-glia-gray/25 rounded-md px-3 py-2 text-body-m outline-none focus:border-cortex-violet/60"
          />
          <button className="btn-primary" onClick={handleCreate}>Create</button>
        </div>
      )}

      {agents.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={28} />}
          title="No agents yet."
          body="Create your first one to wake the village."
          action={<button className="btn-primary" onClick={() => setCreating(true)}>Create your first agent</button>}
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