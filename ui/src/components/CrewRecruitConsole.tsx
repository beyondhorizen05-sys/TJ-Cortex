import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAgents } from '../store/agents';

type CrewClassSummary = {
  id: string;
  name: string;
  summary: string;
  role: string;
  tier: 'builtin' | 'archive';
  suggestedTools: string[];
};

interface CrewRecruitConsoleProps {
  onClose: () => void;
  onNotice: (message: string) => void;
}

export function CrewRecruitConsole({ onClose, onNotice }: CrewRecruitConsoleProps) {
  const [classes, setClasses] = useState<CrewClassSummary[]>([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<CrewClassSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [recruiting, setRecruiting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listCrewClasses()
      .then((catalog) => {
        setClasses(catalog.all);
        setSelected(catalog.builtin[0] ?? catalog.all[0] ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load crew catalog.'))
      .finally(() => setLoading(false));
  }, []);

  const recruit = async () => {
    if (!selected || recruiting) return;
    setRecruiting(true);
    setError('');
    try {
      const agent = await api.recruitCrew(selected.id, name.trim() || undefined);
      const current = useAgents.getState();
      if (!current.agents.some((item) => item.id === agent.id)) {
        useAgents.setState({ agents: [...current.agents, agent], selectedId: agent.id });
      }
      setName('');
      onNotice(`${agent.name} recruited as ${selected.name}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recruitment failed.');
    } finally {
      setRecruiting(false);
    }
  };

  return (
    <div className="open-world__crew-console" role="dialog" aria-modal="true" aria-label="Crew recruitment">
      <div className="open-world__crew-console-card">
        <div className="open-world__crew-header">
          <div>
            <span className="open-world__eyebrow">AGENT HQ // CREW DESK</span>
            <h2>Recruit Crew</h2>
            <p>Select a persistent specialist to add to TJ-Cortex.</p>
          </div>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <div className="open-world__crew-loading">Loading crew catalog…</div>
        ) : (
          <>
            <div className="open-world__crew-grid">
              {classes.map((crew) => (
                <button
                  key={crew.id}
                  className={`open-world__crew-card ${selected?.id === crew.id ? 'is-selected' : ''}`}
                  onClick={() => setSelected(crew)}
                >
                  <span>{crew.tier === 'builtin' ? 'BUILT-IN' : 'ARCHIVE'}</span>
                  <strong>{crew.name}</strong>
                  <small>{crew.role}</small>
                  <p>{crew.summary}</p>
                </button>
              ))}
            </div>

            <div className="open-world__crew-footer">
              <label>
                <span>Agent name (optional)</span>
                <input
                  value={name}
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={selected?.name ?? 'Agent name'}
                />
              </label>
              <div className="open-world__crew-selection">
                <small>SELECTED CLASS</small>
                <strong>{selected?.name ?? 'None'}</strong>
                <span>{selected?.suggestedTools.join(' · ') ?? ''}</span>
              </div>
              <button className="btn-primary" disabled={!selected || recruiting} onClick={recruit}>
                {recruiting ? 'Recruiting…' : 'Recruit Agent'}
              </button>
            </div>
          </>
        )}

        {error && <div className="open-world__crew-error">{error}</div>}
      </div>
    </div>
  );
}
