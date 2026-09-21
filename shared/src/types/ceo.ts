import { z } from 'zod';

export const CeoProfile = z.object({
  agentId: z.string().min(1),
  name: z.string().min(1),
  setupComplete: z.boolean(),
});
export type CeoProfile = z.infer<typeof CeoProfile>;

export const CeoSetupInput = z.object({
  name: z.string().trim().min(1).max(80),
});
export type CeoSetupInput = z.infer<typeof CeoSetupInput>;
