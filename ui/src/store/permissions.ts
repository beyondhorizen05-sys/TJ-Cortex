import { create } from 'zustand';
import type { PermissionRequest } from '@tj-cortex/shared';
import { api } from '../lib/api';
import { on, WS } from '../lib/ws';
import { sound } from '../lib/sound';

interface PermissionsState {
  pending: PermissionRequest[];
  resolve: (id: string, decision: 'allow_once' | 'allow_always' | 'deny') => Promise<void>;
}

export const usePermissions = create<PermissionsState>((set, get) => ({
  pending: [],
  resolve: async (id, decision) => {
    await api.resolvePermission(id, decision);
    set({ pending: get().pending.filter((p) => p.id !== id) });
  },
}));

on(WS.PermissionRequested, (req: PermissionRequest) => {
  const s = usePermissions.getState();
  if (s.pending.find((p) => p.id === req.id)) return;
  sound.meetingChime();
  usePermissions.setState({ pending: [...s.pending, req] });
});