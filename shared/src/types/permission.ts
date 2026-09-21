import { z } from 'zod';

export const PermissionKind = z.enum([
  'fs.read',
  'fs.write',
  'shell.exec',
  'http.outbound',
  'browser.navigate',
  'mcp.call',
  'messaging.send',
  'voice.capture',
  'calendar.write',
  'economy.spend',
  'economy.external_transfer',
  'outbox.write',
]);
export type PermissionKind = z.infer<typeof PermissionKind>;

export const PermissionRequest = z.object({
  id: z.string(),
  agentId: z.string(),
  kind: PermissionKind,
  scope: z.string(),
  reason: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
});
export type PermissionRequest = z.infer<typeof PermissionRequest>;

export const PermissionDecision = z.enum(['allow_once', 'allow_always', 'deny']);
export type PermissionDecision = z.infer<typeof PermissionDecision>;

export const PermissionResolution = z.object({
  id: z.string(),
  decision: PermissionDecision,
  resolvedAt: z.number(),
  resolvedBy: z.enum(['user', 'policy']),
  note: z.string().optional(),
});
export type PermissionResolution = z.infer<typeof PermissionResolution>;

export const PermissionPolicy = z.object({
  kind: PermissionKind,
  scope: z.string(),
  decision: PermissionDecision,
  grantedAt: z.number(),
  expiresAt: z.number().optional(),
});
export type PermissionPolicy = z.infer<typeof PermissionPolicy>;