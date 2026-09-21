import { z } from 'zod';

export const Skill = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  /** Either an inline prompt fragment or a tool name. */
  kind: z.enum(['prompt', 'tool', 'composite']),
  promptTemplate: z.string().optional(),
  toolName: z.string().optional(),
  composedSkills: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  createdAt: z.number(),
});
export type Skill = z.infer<typeof Skill>;