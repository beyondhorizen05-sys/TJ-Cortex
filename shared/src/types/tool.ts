import { z } from 'zod';

export const ToolCategory = z.enum([
  'fs',
  'shell',
  'http',
  'browser',
  'mcp',
  'messaging',
  'voice',
  'calendar',
  'recipe',
  'skill',
  'economy',
  'outbox',
  'memory',
]);
export type ToolCategory = z.infer<typeof ToolCategory>;

export const ToolRisk = z.enum(['read', 'write', 'destructive', 'spend', 'external']);
export type ToolRisk = z.infer<typeof ToolRisk>;

export const ToolDescriptor = z.object({
  name: z.string(),
  category: ToolCategory,
  description: z.string(),
  risk: ToolRisk,
  parameters: z.record(z.unknown()),
  requiresConsent: z.boolean().default(false),
  scoped: z.boolean().default(true),
  enabled: z.boolean().default(true),
});
export type ToolDescriptor = z.infer<typeof ToolDescriptor>;

export const ToolInvocation = z.object({
  id: z.string(),
  agentId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
  requestedAt: z.number(),
});
export type ToolInvocation = z.infer<typeof ToolInvocation>;

export const ToolResult = z.object({
  invocationId: z.string(),
  ok: z.boolean(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  durationMs: z.number().nonnegative(),
  resolvedAt: z.number(),
});
export type ToolResult = z.infer<typeof ToolResult>;