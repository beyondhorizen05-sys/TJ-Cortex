import { create } from 'zustand';
import type { Conversation, TranscriptMessage } from '@tj-cortex/shared';
import { api } from '../lib/api';
import { on, WS } from '../lib/ws';

interface ConversationsState {
  list: Conversation[];
  currentId: string | null;
  messages: TranscriptMessage[];
  streaming: {
    text: string;
    reasoning: string;
    active: boolean;
    conversationId?: string;
  };
  load: () => Promise<void>;
  open: (id: string) => Promise<void>;
  send: (agentId: string, input: string, conversationId?: string) => Promise<void>;
  clearStream: () => void;
}

export const useConversations = create<ConversationsState>((set, get) => ({
  list: [],
  currentId: null,
  messages: [],
  streaming: { text: '', reasoning: '', active: false },
  load: async () => {
    const list = await api.listConversations();
    set({ list });
  },
  open: async (id) => {
    set({ currentId: id });
    const c = await api.getConversation(id);
    set({ messages: c.messages ?? [] });
  },
  send: async (agentId, input, conversationId) => {
    set({ streaming: { text: '', reasoning: '', active: true, conversationId } });
    try {
      const res = await api.runTurn({ agentId, conversationId, input });
      if (!get().currentId) set({ currentId: res.conversationId });
      // Reload the transcript for the final canonical messages.
      const c = await api.getConversation(res.conversationId);
      set({ messages: c.messages ?? [], streaming: { text: '', reasoning: '', active: false } });
      await get().load();
    } catch (e) {
      set({ streaming: { text: '', reasoning: '', active: false } });
      throw e;
    }
  },
  clearStream: () => set({ streaming: { text: '', reasoning: '', active: false } }),
}));

on(WS.StreamDelta, ({ conversationId, delta }: any) => {
  const s = useConversations.getState();
  if (s.currentId && conversationId && s.currentId !== conversationId) return;
  useConversations.setState({
    streaming: { ...s.streaming, active: true, text: s.streaming.text + delta },
  });
});

on(WS.ReasoningDelta, ({ conversationId, delta }: any) => {
  const s = useConversations.getState();
  if (s.currentId && conversationId && s.currentId !== conversationId) return;
  useConversations.setState({
    streaming: { ...s.streaming, active: true, reasoning: s.streaming.reasoning + delta },
  });
});

on(WS.MessageAdded, (m: any) => {
  const s = useConversations.getState();
  if (!s.currentId || s.currentId !== m.conversationId) return;
  if (s.messages.find((x) => x.id === m.id)) return;
  useConversations.setState({ messages: [...s.messages, m] });
});