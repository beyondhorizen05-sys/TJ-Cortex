import { create } from 'zustand';

export type PanelId =
  | 'agents' | 'transcript' | 'providers' | 'recipes' | 'skills' | 'mcp'
  | 'outbox' | 'ledger' | 'contracts' | 'bounties' | 'guilds' | 'wallet'
  | 'reputation' | 'cost' | 'settings' | 'village' | 'openWorld' | 'crew';

interface UiState {
  panel: PanelId;
  theme: 'dark' | 'light';
  connected: boolean;
  setPanel: (p: PanelId) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setConnected: (c: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  panel: 'agents',
  theme: 'dark',
  connected: false,
  setPanel: (panel) => set({ panel }),
  setTheme: (theme) => set({ theme }),
  setConnected: (connected) => set({ connected }),
}));
