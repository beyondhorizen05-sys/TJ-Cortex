import { create } from 'zustand';
import { WS_EVENTS } from '@tj-cortex/shared';
import type { Agent } from '@tj-cortex/shared';
import { on } from '../lib/wsBridge';

export type Weather = 'clear' | 'rain' | 'fog';

export interface VillageAgent {
  id: string;
  name: string;
  state: string;
  location: string;
  /** Target world position (x, z). Y is derived from terrain. */
  x: number;
  z: number;
  heading: number;
  /** Accent colors baked from avatar for rendering. */
  accentColor: string;
  glowColor: string;
}

interface VillageState {
  agents: VillageAgent[];
  time: { dayFraction: number; isNight: boolean };
  weather: Weather;
  /** UI overlay, not required for rendering. */
  selectedAgentId: string | null;

  /** Replace the roster from the sidecar (initial fetch). */
  setAgents: (agents: Agent[]) => void;
  upsertAgent: (a: Partial<VillageAgent> & { id: string }) => void;
  removeAgent: (id: string) => void;
  setPosition: (p: { agentId: string; x: number; z: number; heading: number; location?: string; state?: string }) => void;
  setTime: (dayFraction: number) => void;
  setWeather: (w: Weather) => void;
  select: (id: string | null) => void;
}

export const useVillage = create<VillageState>((set, get) => ({
  agents: [],
  time: { dayFraction: 0.45, isNight: false },
  weather: 'clear',
  selectedAgentId: null,

  setAgents: (agents) =>
    set({
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        state: a.state,
        location: a.location,
        x: a.position?.x ?? 0,
        z: a.position?.z ?? 0,
        heading: 0,
        accentColor: a.avatar?.accentColor ?? '#6C4CF1',
        glowColor: a.avatar?.glowColor ?? '#22D3EE',
      })),
    }),

  upsertAgent: (a) => {
    const existing = get().agents.find((x) => x.id === a.id);
    if (existing) {
      set({ agents: get().agents.map((x) => (x.id === a.id ? { ...x, ...a } : x)) });
    } else {
      set({
        agents: [
          ...get().agents,
          {
            id: a.id,
            name: a.name ?? 'Agent',
            state: a.state ?? 'idle',
            location: a.location ?? 'node',
            x: a.x ?? 0,
            z: a.z ?? 0,
            heading: a.heading ?? 0,
            accentColor: a.accentColor ?? '#6C4CF1',
            glowColor: a.glowColor ?? '#22D3EE',
          },
        ],
      });
    }
  },

  removeAgent: (id) => set({ agents: get().agents.filter((a) => a.id !== id) }),

  setPosition: (p) =>
    set({
      agents: get().agents.map((a) =>
        a.id === p.agentId
          ? { ...a, x: p.x, z: p.z, heading: p.heading, location: p.location ?? a.location, state: p.state ?? a.state }
          : a,
      ),
    }),

  setTime: (dayFraction) => set({ time: { dayFraction, isNight: dayFraction < 0.22 || dayFraction > 0.78 } }),
  setWeather: (weather) => set({ weather }),
  select: (id) => set({ selectedAgentId: id }),
}));

/* ---------- WS wiring (called by VillageMount on mount) ---------- */
export function bindVillageEvents() {
  // Lazy import to avoid circular dependency at module load time.
  const offs: Array<() => void> = [];

  offs.push(on(WS_EVENTS.AgentCreated, (a: Agent) => {
    const st = useVillage.getState();
    st.upsertAgent({
      id: a.id,
      name: a.name,
      state: a.state,
      location: a.location,
      x: a.position?.x ?? 0,
      z: a.position?.z ?? 0,
      accentColor: a.avatar?.accentColor ?? '#6C4CF1',
      glowColor: a.avatar?.glowColor ?? '#22D3EE',
    });
  }));
  offs.push(on(WS_EVENTS.AgentUpdated, (a: Agent) => {
    useVillage.getState().upsertAgent({
      id: a.id, name: a.name, state: a.state, location: a.location,
      accentColor: a.avatar?.accentColor ?? '#6C4CF1', glowColor: a.avatar?.glowColor ?? '#22D3EE',
    });
  }));
  offs.push(on(WS_EVENTS.AgentDeleted, ({ id }: { id: string }) => useVillage.getState().removeAgent(id)));
  offs.push(on(WS_EVENTS.VillagePositionUpdate, (p: any) => useVillage.getState().setPosition(p)));
  offs.push(on(WS_EVENTS.VillageTime, (t: any) => useVillage.getState().setTime(t.dayFraction)));
  offs.push(on(WS_EVENTS.VillageWeather, (w: any) => useVillage.getState().setWeather(w)));

  return () => { for (const off of offs) off(); };
}