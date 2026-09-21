import { create } from 'zustand';
import type { OutboxItem } from '@tj-cortex/shared';
import { api } from '../lib/api';
import { on, WS } from '../lib/ws';

interface OutboxState {
  items: OutboxItem[];
  load: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useOutbox = create<OutboxState>((set, get) => ({
  items: [],
  load: async () => set({ items: await api.listOutbox() }),
  remove: async (id) => {
    await api.deleteOutbox(id);
    set({ items: get().items.filter((x) => x.id !== id) });
  },
}));

on(WS.OutboxUpdated, (item: OutboxItem) => {
  const s = useOutbox.getState();
  if (s.items.find((x) => x.id === item.id)) return;
  useOutbox.setState({ items: [item, ...s.items] });
});