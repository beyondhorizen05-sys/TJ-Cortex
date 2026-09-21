import { z } from 'zod';

export const RecipeStep = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  tool: z.string().optional(),
  params: z.record(z.unknown()).default({}),
  optional: z.boolean().default(false),
});

export const Recipe = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  steps: z.array(RecipeStep).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Recipe = z.infer<typeof Recipe>;