import { z } from 'zod';

export const MessageKind = z.enum([
  'chat.user',
  'chat.agent',
  'agent.to_agent',
  'tool.result',
  'system.note',
  'meeting.note',
  'contract.event',
  'bounty.event',
  'ledger.event',
]);
export type MessageKind = z.infer<typeof MessageKind>;

export const TranscriptMessage = z.object({
  id: z.string(),
  conversationId: z.string(),
  kind: MessageKind,
  fromAgentId: z.string().optional(),
  toAgentId: z.string().optional(),
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  reasoning: z.string().optional(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  usage: z
    .object({
      inputTokens: z.number().default(0),
      outputTokens: z.number().default(0),
      reasoningTokens: z.number().optional(),
    })
    .optional(),
  costUsd: z.number().nonnegative().default(0),
  model: z.string().optional(),
  providerId: z.string().optional(),
  createdAt: z.number(),
});
export type TranscriptMessage = z.infer<typeof TranscriptMessage>;

export const Conversation = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(['user_agent', 'agent_agent', 'meeting', 'trade']),
  agentIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Conversation = z.infer<typeof Conversation>;