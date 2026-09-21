import { z } from 'zod';

export const TaskBriefOption = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().default(''),
});

export const TaskBrief = z.object({
  id: z.string(),
  agentId: z.string(),
  title: z.string(),
  question: z.string(),
  options: z.array(TaskBriefOption).min(1),
  status: z.enum(['pending', 'answered', 'expired', 'cancelled']),
  selectedOptionId: z.string().optional(),
  answerNote: z.string().optional(),
  createdAt: z.number(),
  answeredAt: z.number().optional(),
  expiresAt: z.number().optional(),
});

export type TaskBrief = z.infer<typeof TaskBrief>;
export type TaskBriefOption = z.infer<typeof TaskBriefOption>;
