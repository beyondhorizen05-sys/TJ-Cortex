import { create } from 'zustand';
import type { ProviderStatus } from '@tj-cortex/shared';
import { api } from '../lib/api';

interface ProvidersState {
  statuses: ProviderStatus[];
  google: { configured: boolean; email?: string };
  load: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  setKey: (id: string, key: string) => Promise<void>;
  clearKey: (id: string) => Promise<void>;
}

export const useProviders = create<ProvidersState>((set, get) => ({
  statuses: [],
  google: { configured: false },
  load: async () => {
    const [statuses, google] = await Promise.all([api.listProviders(), api.googleStatus()]);
    set({ statuses, google });
  },
  signInGoogle: async () => {
    const res = await api.googleSignIn();
    set({ google: { configured: true, email: res.email } });
    await get().load();
  },
  signOutGoogle: async () => {
    await api.googleSignOut();
    set({ google: { configured: false } });
    await get().load();
  },
  setKey: async (id, key) => {
    await api.setProviderKey(id, key);
    await get().load();
  },
  clearKey: async (id) => {
    await api.deleteProviderKey(id);
    await get().load();
  },
}));