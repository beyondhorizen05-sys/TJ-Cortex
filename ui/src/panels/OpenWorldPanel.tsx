import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgents } from '../store/agents';
import { CrewRecruitConsole } from '../components/CrewRecruitConsole';
import { CeoCharacter } from '../components/CeoCharacter';
import { CeoExecutiveConsole } from '../components/CeoExecutiveConsole';
import { useUi, type PanelId } from '../store/ui';

type Vec2 = { x: number; y: number };
type AgentWithCeoFlag = { isCeo?: boolean; role?: string };

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

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']);

export function OpenWorldPanel() {
  const agents = useAgents((s) => s.agents);
  const selectedId = useAgents((s) => s.selectedId);
  const select = useAgents((s) => s.select);
  const [player, setPlayer] = useState<Vec2>({ x: 50, y: 52 });
  const [nearby, setNearby] = useState<string | null>(null);
  const [notice, setNotice] = useState('WASD / Arrow Keys to move · Shift to sprint · E to interact');
  const [camera, setCamera] = useState<Vec2>(player);
  const [agentWorldPositions, setAgentWorldPositions] = useState<Record<string, Vec2>>({});
  const agentWorldPositionsRef = useRef<Record<string, Vec2>>({});
  const [crewConsoleOpen, setCrewConsoleOpen] = useState(false);
  const [ceoConsoleOpen, setCeoConsoleOpen] = useState(false);
  const [interactionLocked, setInteractionLocked] = useState(false);
  const keys = useRef(new Set<string>());
  const nearestRef = useRef<(typeof BUILDINGS)[number] | null>(null);
  const nearestAgentRef = useRef<string | null>(null);
  const interactionLockRef = useRef(false);
  const playerRef = useRef(player);
  const selected = agents.find((a) => a.id === selectedId);
  const ceoAgent = agents.find((agent) => Boolean((agent as AgentWithCeoFlag).isCeo) || String(agent.role ?? '').toLowerCase() === 'ceo');
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
    nearestRef.current = nearest;
    setNearby(nearest?.id ?? null);
  }, [nearest, ceoAgent, agents, select]);

  const getAgentHome = (index: number): Vec2 => ({
    x: 27 + (index % 4) * 7,
    y: 29 + Math.floor(index / 4) * 8,
  });

  useEffect(() => {
    const next = { ...agentWorldPositionsRef.current };
    agents.slice(0, 12).forEach((agent, index) => {
      if (!next[agent.id]) next[agent.id] = getAgentHome(index);
    });
    const activeIds = new Set(agents.slice(0, 12).map((agent) => agent.id));
    Object.keys(next).forEach((id) => {
      if (!activeIds.has(id)) delete next[id];
    });
    agentWorldPositionsRef.current = next;
    setAgentWorldPositions(next);
  }, [agents]);

  const nearestAgent = useMemo(() => {
    let bestId: string | null = null;
    let distance = Infinity;
    agents.slice(0, 12).forEach((agent, index) => {
      const pos = agentWorldPositions[agent.id] ?? getAgentHome(index);
      const d = Math.hypot(pos.x - player.x, pos.y - player.y);
      if (d < distance) {
        distance = d;
        bestId = agent.id;
      }
    });
    return distance < 8 ? bestId : null;
  }, [agents, player]);

  useEffect(() => {
    nearestAgentRef.current = nearestAgent;
  }, [nearestAgent]);

  const openBuilding = (building: (typeof BUILDINGS)[number]) => {
    if (interactionLockRef.current) return;
    interactionLockRef.current = true;
    setInteractionLocked(true);
    setNotice(`${building.name} — ${building.subtitle}`);
    if (building.id === 'hq') {
      setCrewConsoleOpen(true);
      return;
    }
    const panel = BUILDING_PANELS[building.id];
    if (panel) setPanel(panel);
  };

  const releaseInteractionLock = () => {
    interactionLockRef.current = false;
    setInteractionLocked(false);
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      event.preventDefault();
      keys.current.add(key);
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const interact = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e') return;
      if (ceoAgent && !interactionLockRef.current) {
        const ceoPosition = agentWorldPositionsRef.current[ceoAgent.id];
        if (ceoPosition && Math.hypot(ceoPosition.x - playerRef.current.x, ceoPosition.y - playerRef.current.y) < 9) {
          event.preventDefault();
          interactionLockRef.current = true;
          setInteractionLocked(true);
          setCeoConsoleOpen(true);
          setNotice(`${ceoAgent.name} · executive command layer opened`);
          return;
        }
      }
      const building = nearestRef.current;
      if (building && !interactionLockRef.current) {
        event.preventDefault();
        openBuilding(building);
        return;
      }
      const agentId = nearestAgentRef.current;
      if (!agentId || interactionLockRef.current) return;
      event.preventDefault();
      select(agentId);
      setPanel('agents');
      const agent = agents.find((item) => item.id === agentId);
      setNotice(`${agent?.name ?? 'Agent'} — runtime profile opened`);
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

      const nextAgentPositions = { ...agentWorldPositionsRef.current };
      let agentPositionsChanged = false;
      agents.slice(0, 12).forEach((agent, index) => {
        const current = nextAgentPositions[agent.id] ?? getAgentHome(index);
        const state = String(agent.state ?? 'idle').toLowerCase();
        const target = state === 'meeting'
          ? { x: 43, y: 38 }
          : state === 'working'
            ? { x: 50, y: 52 }
            : getAgentHome(index);
        const speed = state === 'offline' ? 0.04 : state === 'meeting' ? 0.085 : 0.055;
        const next = {
          x: current.x + (target.x - current.x) * speed * dt,
          y: current.y + (target.y - current.y) * speed * dt,
        };
        if (Math.abs(next.x - current.x) > 0.01 || Math.abs(next.y - current.y) > 0.01) agentPositionsChanged = true;
        nextAgentPositions[agent.id] = next;
      });
      if (agentPositionsChanged) {
        agentWorldPositionsRef.current = nextAgentPositions;
        setAgentWorldPositions(nextAgentPositions);
      }

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
          <p className="open-world__ceo-badge">{ceoAgent ? `CEO AGENT · ${ceoAgent.name}` : "CEO CHARACTER · READY FOR IDENTITY"}</p>
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
              onClick={() => openBuilding(building)}
            >
              <span className="open-world__building-top" />
              <strong>{building.name}</strong>
              <small>{building.subtitle}</small>
            </button>
          ))}

          {ceoAgent && (
            <CeoCharacter
              name={ceoAgent.name}
              state={String(ceoAgent.state ?? 'idle')}
              x={agentWorldPositions[ceoAgent.id]?.x ?? 50}
              y={agentWorldPositions[ceoAgent.id]?.y ?? 52}
              selected={ceoAgent.id === selectedId}
              onClick={() => {
                select(ceoAgent.id);
                interactionLockRef.current = true;
                setInteractionLocked(true);
                setCeoConsoleOpen(true);
                setNotice(`${ceoAgent.name} · executive command layer opened`);
              }}
            />
          )}

          {agents.slice(0, 12).map((agent, index) => {
            const active = agent.id === selectedId;
            const position = agentWorldPositions[agent.id] ?? getAgentHome(index);
            const x = position.x;
            const y = position.y;
            return (
              <button
                key={agent.id}
                className={`open-world__agent ${active ? 'is-selected' : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => {
                  select(agent.id);
                  setPanel('agents');
                  setNotice(`${agent.name} · ${String(agent.state ?? 'unknown')} · runtime profile opened`);
                }}
                title={agent.name}
              >
                <span className={`open-world__agent-head open-world__agent-head--${String(agent.state ?? 'idle').toLowerCase()}`} />
                <span className="open-world__agent-label">{agent.name} · {String(agent.state ?? 'idle')}</span>
              </button>
            );
          })}

          <div className="open-world__player" style={{ left: `${player.x}%`, top: `${player.y}%` }}>
            <span />
          </div>
        </div>
      </div>

      <aside className="open-world__panel">
        <div className="open-world__ceo-card">
          <span className="open-world__panel-label">CEO AGENT</span>
          <div className="open-world__ceo-avatar" aria-label="CEO character">
            <span className="open-world__ceo-avatar-glow" />
            <span className="open-world__ceo-avatar-silhouette" />
          </div>
          <strong>{ceoAgent?.name ?? 'Identity pending'}</strong>
          <small>{ceoAgent ? 'Main AI · Executive control' : 'Startup will request her name'}</small>
        </div>
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
          <strong>{nearest?.name ?? (nearestAgent ? agents.find((a) => a.id === nearestAgent)?.name ?? 'Agent' : 'Open road')}</strong>
          <small>{nearest ? 'Press E to interact' : nearestAgent ? 'Press E to open agent runtime' : 'Explore the city'}</small>
        </div>
      </aside>
      {interactionLocked && (
        <button className="open-world__interaction-backdrop" aria-label="Close active interaction" onClick={() => {
          setCrewConsoleOpen(false);
          setCeoConsoleOpen(false);
          releaseInteractionLock();
        }} />
      )}
      {ceoConsoleOpen && ceoAgent && (
        <CeoExecutiveConsole
          ceo={ceoAgent}
          agents={agents}
          onClose={() => {
            setCeoConsoleOpen(false);
            releaseInteractionLock();
          }}
          onNotice={setNotice}
        />
      )}
      {crewConsoleOpen && (
        <CrewRecruitConsole
          onClose={() => {
            setCrewConsoleOpen(false);
            releaseInteractionLock();
          }}
          onNotice={setNotice}
        />
      )}
    </section>
  );
}
