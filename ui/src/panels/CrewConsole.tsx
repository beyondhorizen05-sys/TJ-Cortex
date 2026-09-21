import { useEffect, useMemo, useState } from 'react';
import { useAgents } from '../store/agents';
import { api } from '../lib/api';

type CrewClass = {
  id: string;
  name: string;
  summary: string;
  role: string;
  tier: 'builtin' | 'archive';
  suggestedTools: string[];
};

export function CrewConsole() {
  const agents = useAgents((s) => s.agents);
  const selectedId = useAgents((s) => s.selectedId);
  const select = useAgents((s) => s.select);
  const load = useAgents((s) => s.load);
  const [classes, setClasses] = useState<CrewClass[]>([]);
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => agents.find((agent) => agent.id === selectedId), [agents, selectedId]);

  useEffect(() => {
    void load();
    fetch('/api/crew/classes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load crew classes');
        return res.json() as Promise<{ all: CrewClass[] }>;
      })
      .then((data) => {
        setClasses(data.all);
        setClassId((current) => current || data.all[0]?.id || '');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to load crew classes'));
  }, [load]);

  const recruit = async () => {
    if (!classId || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/crew/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crewClassId: classId, name: name.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.text()).slice(0, 300));
      const agent = await res.json();
      setName('');
      select(agent.id);
      await load();
      setMessage(agent.name + ' recruited');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Recruitment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="crew-console">
      <header className="crew-console__header">
        <div>
          <span className="crew-console__eyebrow">CREW MANAGEMENT</span>
          <h2>Build your AI crew</h2>
          <p>Recruit persistent specialists who appear in the open world and use the real TJ-Cortex runtime.</p>
        </div>
        <strong>{agents.length} agents</strong>
      </header>

      <div className="crew-console__recruit">
        <label>
          Crew class
          <select value={classId} onChange={(event) => setClassId(event.target.value)}>
            {classes.map((crew) => <option key={crew.id} value={crew.id}>{crew.name} · {crew.role}</option>)}
          </select>
        </label>
        <label>
          Name
          <input value={name} maxLength={80} placeholder="Optional custom name" onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" disabled={busy || !classId} onClick={() => void recruit()}>
          {busy ? 'Recruiting…' : 'Recruit Agent'}
        </button>
        {message && <span>{message}</span>}
      </div>

      <div className="crew-console__grid">
        <div className="crew-console__roster">
          {agents.map((agent) => (
            <button
              type="button"
              key={agent.id}
              className={agent.id === selectedId ? 'is-selected' : ''}
              onClick={() => select(agent.id)}
            >
              <span className="crew-console__avatar" />
              <span>
                <strong>{agent.name}</strong>
                <small>{agent.crewClassId ?? agent.role} · {String(agent.state ?? 'idle')}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="crew-console__detail">
          {selected ? (
            <>
              <span className="crew-console__eyebrow">AGENT PROFILE</span>
              <h3>{selected.name}</h3>
              <dl>
                <div><dt>Class</dt><dd>{selected.crewClassId ?? 'Generalist'}</dd></div>
                <div><dt>Role</dt><dd>{selected.role}</dd></div>
                <div><dt>Provider</dt><dd>{selected.providerId}</dd></div>
                <div><dt>Model</dt><dd>{selected.modelId}</dd></div>
                <div><dt>State</dt><dd>{String(selected.state ?? 'idle')}</dd></div>
                <div><dt>Location</dt><dd>{String(selected.location ?? 'node')}</dd></div>
              </dl>
            </>
          ) : (
            <p>Select an agent to inspect its live profile.</p>
          )}
        </div>
      </div>
    </section>
  );
}
