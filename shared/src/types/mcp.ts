import { z } from 'zod';

export const McpTransport = z.enum(['stdio', 'sse']);
export type McpTransport = z.infer<typeof McpTransport>;

export const McpServerConfig = z.object({
  id: z.string(),
  name: z.string(),
  transport: McpTransport,
  /** For stdio. */
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  /** For sse. */
  url: z.string().url().optional(),
  enabled: z.boolean().default(true),
  trustedTools: z.array(z.string()).default([]),
});
export type McpServerConfig = z.infer<typeof McpServerConfig>;

export const McpToolExposure = z.object({
  serverId: z.string(),
  toolName: z.string(),
  description: z.string(),
  risk: z.enum(['read', 'write', 'destructive', 'spend', 'external']),
});
export type McpToolExposure = z.infer<typeof McpToolExposure>;