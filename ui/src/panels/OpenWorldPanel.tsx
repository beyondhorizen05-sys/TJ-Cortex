import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgents } from '../store/agents';
import { CrewRecruitConsole } from '../components/CrewRecruitConsole';
import { useUi, type PanelId } from '../store/ui';

type Vec2 = { x: number; y: number };

const BUILDINGS = [
  { id: 'hq', name: 'Agent HQ', subtitle: 'Agents & workspaces', x: 18, y: 18, tone: 'violet' },
  { id: 'guild', name: 'Guild Hall', subtitle: 'Reputation & history', x: 64, y: 15, tone: 'cyan' },
  { id: 'bank', name: 'Myelin Bank', subtitle: 'Budgets & ledger', x: 78, y: 50, tone: 'amber' },
  { id: 'outbox', name: 'OUTBOX', subtitle: 'Deliverables', x: 54, y: 70, tone: 'emerald' },
  { id: 'mcp', name: 'MCP Facility', subtitle: 'Tools & connectors', x: 18, y: 67, tone: 'blue' },
  { id: 'meeting', name: 'Meeting Center', subtitle: 'Agent meetings', x: 43, y: 38, tone: 'rose' },
] as const;

const BUILDING_PANELS: Partial<Record<(typeof BUILDINGS)[number]['id'], PanelId>> = {
  guild: 'reputation', bank: 'wallet', outbox: 'outbox', mcp: 'mcp', meeting: 'transcript',
};

/*
] as const;
*/

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']);

export function OpenWorldPanel() {
  const agents = useAgents((s) => s.agents);
  const selectedId = useAgents((s) => s.selectedId);
  const select = useAgents((s) => s.select);
  const [player, setPlayer] = useState<Vec2>({ x: 50, y: 52 });
  const [nearby, setNearby] = useState<string | null>(null);
  const [notice, setNotice] = useState('WASD / Arrow Keys to move · Shift to sprint · E to interact');
  const [camera, setCamera] = useState<Vec2>(player);
  const [crewConsoleOpen, setCrewConsoleOpen] = useState(false);
  const keys = useRef(new Set<string>());
  const playerRef = useRef(player);
  const selected = agents.find((a) => a.id === selectedId);
  const setPanel = useUi((s) => s.setPanel);
  const setPanel = useUi((s) => s.setPanel);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

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
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      event.preventDefault();
      keys.current.add(key);
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const interact = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e' || !nearest) return;
      event.preventDefault();
      if (nearest.id === 'hq') {
        setCrewConsoleOpen(true);
        setNotice('Agent HQ — crew recruitment desk opened');
      } else {
        setNotice(`${nearest.name} — ${nearest.subtitle}`);
        const panel = BUILDING_PANELS[nearest.id];
        if (panel) setPanel(panel);
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('keydown', interact);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      const held = keys.current;
      const horizontal = (held.has('a') || held.has('arrowleft') ? -1 : 0) + (held.has('d') || held.has('arrowright') ? 1 : 0);
      const vertical = (held.has('w') || held.has('arrowup') ? -1 : 0) + (held.has('s') || held.has('arrowdown') ? 1 : 0);
      const moving = horizontal !== 0 || vertical !== 0;
      const step = (held.has('shift') ? 1.15 : 0.72) * dt;

      if (moving) {
        setPlayer((current) => {
          const next = {
            x: Math.max(7, Math.min(93, current.x + horizontal * step)),
            y: Math.max(8, Math.min(92, current.y + vertical * step)),
          };
          playerRef.current = next;
          return next;
        });
      }

      const target = playerRef.current;
      setCamera((current) => ({
        x: current.x + (target.x - current.x) * 0.12,
        y: current.y + (target.y - current.y) * 0.12,
      }));

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('keydown', interact);
    };
  }, [nearest]);

  return (
    <section className="open-world">
      <div className="open-world__camera-readout">CAM <b>{camera.x.toFixed(0)} / {camera.y.toFixed(0)}</b></div>
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
        <div className="open-world__world" style={{ transform: `rotateX(55deg) scale(1.18) translate(${50 - camera.x}%, ${52 - camera.y}%)` }}>
          <div className="open-world__road open-world__road--h" />
          <div className="open-world__road open-world__road--v" />
          <div className="open-world__road open-world__road--diag" />

          {BUILDINGS.map((building) => (
            <button
              key={building.id}
              className={`open-world__building open-world__building--${building.tone} ${nearby === building.id ? 'is-nearby' : ''}`}
              style={{ left: `${building.x}%`, top: `${building.y}%` }}
              onClick={() => {
                if (building.id === 'hq') {
                  setCrewConsoleOpen(true);
                  setNotice('Agent HQ — crew recruitment desk opened');
                  return;
                }
                setNotice(`${building.name} — ${building.subtitle}`);
                const panel = BUILDING_PANELS[building.id];
                if (panel) setPanel(panel);
              }}
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
      {crewConsoleOpen && (
        <CrewRecruitConsole
          onClose={() => setCrewConsoleOpen(false)}
          onNotice={setNotice}
        />
      )}
    </section>
  );
}
