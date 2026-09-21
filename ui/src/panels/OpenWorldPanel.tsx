import { useEffect, useMemo, useState } from 'react';
import { useAgents } from '../store/agents';

type Vec2 = { x: number; y: number };

const BUILDINGS = [
  { id: 'hq', name: 'Agent HQ', subtitle: 'Agents & workspaces', x: 18, y: 18, tone: 'violet' },
  { id: 'guild', name: 'Guild Hall', subtitle: 'Reputation & history', x: 64, y: 15, tone: 'cyan' },
  { id: 'bank', name: 'Myelin Bank', subtitle: 'Budgets & ledger', x: 78, y: 50, tone: 'amber' },
  { id: 'outbox', name: 'OUTBOX', subtitle: 'Deliverables', x: 54, y: 70, tone: 'emerald' },
  { id: 'mcp', name: 'MCP Facility', subtitle: 'Tools & connectors', x: 18, y: 67, tone: 'blue' },
  { id: 'meeting', name: 'Meeting Center', subtitle: 'Agent meetings', x: 43, y: 38, tone: 'rose' },
] as const;

export function OpenWorldPanel() {
  const agents = useAgents((s) => s.agents);
  const selectedId = useAgents((s) => s.selectedId);
  const select = useAgents((s) => s.select);
  const [player, setPlayer] = useState<Vec2>({ x: 50, y: 52 });
  const [nearby, setNearby] = useState<string | null>(null);
  const [notice, setNotice] = useState('WASD / Arrow Keys to move · E to interact');
  const selected = agents.find((a) => a.id === selectedId);

  const nearest = useMemo(() => {
    let best: (typeof BUILDINGS)[number] | null = null;
    let distance = Infinity;
    for (const building of BUILDINGS) {
      const d = Math.hypot(building.x - player.x, building.y - player.y);
      if (d < distance) {
        distance = d;
        best = building;
      }
    }
    return distance < 11 ? best : null;
  }, [player]);

  useEffect(() => {
    setNearby(nearest?.id ?? null);
  }, [nearest]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e'].includes(key)) return;
      event.preventDefault();

      if (key === 'e') {
        if (nearest) setNotice(`Entered ${nearest.name} — ${nearest.subtitle}`);
        return;
      }

      const step = event.shiftKey ? 2.2 : 1.2;
      setPlayer((p) => ({
        x: Math.max(7, Math.min(93, p.x + (key === 'a' || key === 'arrowleft' ? -step : key === 'd' || key === 'arrowright' ? step : 0))),
        y: Math.max(8, Math.min(92, p.y + (key === 'w' || key === 'arrowup' ? -step : key === 's' || key === 'arrowdown' ? step : 0))),
      }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearest]);

  return (
    <section className="open-world">
      <div className="open-world__hud">
        <div>
          <p className="open-world__eyebrow">TJ-CORTEX // OPEN WORLD</p>
          <h1>Living Agent City</h1>
          <p className="open-world__notice">{notice}</p>
        </div>
        <div className="open-world__status">
          <span className="open-world__dot" />
          Runtime connected
          <strong>{agents.length} agents</strong>
        </div>
      </div>

      <div className="open-world__viewport" aria-label="TJ-Cortex open world">
        <div className="open-world__world">
          <div className="open-world__road open-world__road--h" />
          <div className="open-world__road open-world__road--v" />
          <div className="open-world__road open-world__road--diag" />

          {BUILDINGS.map((building) => (
            <button
              key={building.id}
              className={`open-world__building open-world__building--${building.tone} ${nearby === building.id ? 'is-nearby' : ''}`}
              style={{ left: `${building.x}%`, top: `${building.y}%` }}
              onClick={() => setNotice(`${building.name} — ${building.subtitle}`)}
            >
              <span className="open-world__building-top" />
              <strong>{building.name}</strong>
              <small>{building.subtitle}</small>
            </button>
          ))}

          {agents.slice(0, 12).map((agent, index) => {
            const active = agent.id === selectedId;
            const x = 27 + (index % 4) * 7;
            const y = 29 + Math.floor(index / 4) * 8;
            return (
              <button
                key={agent.id}
                className={`open-world__agent ${active ? 'is-selected' : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => {
                  select(agent.id);
                  setNotice(`${agent.name} · ${String(agent.state ?? 'unknown')}`);
                }}
                title={agent.name}
              >
                <span className="open-world__agent-head" />
                <span className="open-world__agent-label">{agent.name}</span>
              </button>
            );
          })}

          <div className="open-world__player" style={{ left: `${player.x}%`, top: `${player.y}%` }}>
            <span />
          </div>
        </div>
      </div>

      <aside className="open-world__panel">
        <div>
          <span className="open-world__panel-label">PLAYER</span>
          <strong>Operator</strong>
          <small>Free roam</small>
        </div>
        <div>
          <span className="open-world__panel-label">SELECTED AGENT</span>
          <strong>{selected?.name ?? 'None'}</strong>
          <small>{selected ? String(selected.state ?? 'idle') : 'Click an agent'}</small>
        </div>
        <div>
          <span className="open-world__panel-label">NEARBY</span>
          <strong>{nearest?.name ?? 'Open road'}</strong>
          <small>{nearest ? 'Press E to interact' : 'Explore the city'}</small>
        </div>
      </aside>
    </section>
  );
}
