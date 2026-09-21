import { create } from 'zustand';
import type { Agent } from '@tj-cortex/shared';
import { api } from '../lib/api';
import { on, WS } from '../lib/ws';

interface AgentsState {
  agents: Agent[];
  selectedId: string | null;
  loading: boolean;
  load: () => Promise<void>;
  select: (id: string | null) => void;
  create: (input: Partial<Agent> & { name: string }) => Promise<Agent>;
  update: (id: string, patch: Partial<Agent>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useAgents = create<AgentsState>((set, get) => ({
  agents: [],
  selectedId: null,
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const agents = await api.listAgents();
      set({ agents, selectedId: get().selectedId ?? agents[0]?.id ?? null });
    } finally {
      set({ loading: false });
    }
  },
  select: (id) => set({ selectedId: id }),
  create: async (input) => {
    const a = await api.createAgent(input);
    set({ agents: [...get().agents, a], selectedId: a.id });
    return a;
  },
  update: async (id, patch) => {
    const a = await api.updateAgent(id, patch);
    set({ agents: get().agents.map((x) => (x.id === id ? a : x)) });
  },
  remove: async (id) => {
    await api.deleteAgent(id);
    set({
      agents: get().agents.filter((x) => x.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },
}));

// Wire WS updates.
on(WS.AgentCreated, (a: Agent) => {
  const s = useAgents.getState();
  if (!s.agents.find((x) => x.id === a.id)) {
    useAgents.setState({ agents: [...s.agents, a] });
  }
});
on(WS.AgentUpdated, (a: Agent) => {
  useAgents.setState({ agents: useAgents.getState().agents.map((x) => (x.id === a.id ? a : x)) });
});
on(WS.AgentDeleted, ({ id }: { id: string }) => {
  useAgents.setState({
    agents: useAgents.getState().agents.filter((x) => x.id !== id),
    selectedId: useAgents.getState().selectedId === id ? null : useAgents.getState().selectedId,
  });
});
on(WS.AgentStateChanged, ({ agentId, state, location }: any) => {
  useAgents.setState({
    agents: useAgents.getState().agents.map((a) =>
      a.id === agentId ? { ...a, state, location: location ?? a.location } : a,
    ),
  });
});