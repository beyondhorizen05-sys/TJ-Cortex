import { z } from 'zod';

export const MemoryKind = z.enum(['episodic', 'semantic', 'procedural', 'social', 'economic']);
export type MemoryKind = z.infer<typeof MemoryKind>;

export const Memory = z.object({
  id: z.string(),
  agentId: z.string(),
  kind: MemoryKind,
  key: z.string(),
  value: z.string(),
  /** Optional embedding; stored in a separate table. */
  hasEmbedding: z.boolean().default(false),
  importance: z.number().min(0).max(1).default(0.5),
  sourceMessageId: z.string().optional(),
  createdAt: z.number(),
  lastAccessedAt: z.number(),
});
export type Memory = z.infer<typeof Memory>;

export const MemoryQuery = z.object({
  agentId: z.string(),
  kind: MemoryKind.optional(),
  text: z.string().optional(),
  limit: z.number().int().positive().max(200).default(20),
  minImportance: z.number().min(0).max(1).optional(),
});
export type MemoryQuery = z.infer<typeof MemoryQuery>;