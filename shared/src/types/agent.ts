import { z } from 'zod';
import { LOCATION_IDS } from '../constants.js';

export const AgentState = z.enum([
  'working',
  'idle',
  'meeting',
  'blocked',
  'sleeping',
  'trading',
  'earning',
]);
export type AgentState = z.infer<typeof AgentState>;

export const AgentRole = z.enum([
  'generalist',
  'researcher',
  'engineer',
  'writer',
  'analyst',
  'trader',
  'negotiator',
  'coordinator',
]);
export type AgentRole = z.infer<typeof AgentRole>;

export const AgentAvatar = z.object({
  skinTone: z.string().default('#E8B98A'),
  hairStyle: z.string().default('short'),
  hairColor: z.string().default('#2B1B12'),
  outfit: z.string().default('brand-violet'),
  accentColor: z.string().default('#6C4CF1'),
  glowColor: z.string().default('#22D3EE'),
  vrmUrl: z.string().optional(),
});
export type AgentAvatar = z.infer<typeof AgentAvatar>;

export const AgentBoundaries = z.object({
  perDayCC: z.number().nonnegative().default(100),
  perContractCC: z.number().nonnegative().default(25),
  allowExternalTransfers: z.boolean().default(false),
  requireConsentAboveCC: z.number().nonnegative().default(10),
  allowedTools: z.array(z.string()).default([]),
  deniedTools: z.array(z.string()).default([]),
});
export type AgentBoundaries = z.infer<typeof AgentBoundaries>;

export const Agent = z.object({
  id: z.string(),
  name: z.string().min(1),
  crewClassId: z.string().optional(),
  role: AgentRole.default('generalist'),
  isCeo: z.boolean().default(false),
  systemPrompt: z.string().default(''),
  avatar: AgentAvatar.default({}),
  boundaries: AgentBoundaries.default({}),

  providerId: z.string().default('gemini'),
  modelId: z.string().default('gemini-2.0-flash'),

  state: AgentState.default('idle'),
  location: z.enum(LOCATION_IDS).default('node'),

  position: z.object({ x: z.number(), z: z.number() }).default({ x: 0, z: 0 }),

  walletId: z.string(),
  reputationId: z.string(),

  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Agent = z.infer<typeof Agent>;

export const AgentCreateInput = Agent.partial().required({ name: true });
export type AgentCreateInput = z.infer<typeof AgentCreateInput>;
