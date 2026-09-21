import { z } from 'zod';

export const IntegrationId = z.enum([
  'google_signin',
  'discord',
  'slack',
  'telegram',
  'whatsapp',
  'email_smtp',
  'calendar_google',
  'stripe_payout',
  'paypal_payout',
]);
export type IntegrationId = z.infer<typeof IntegrationId>;

export const Integration = z.object({
  id: IntegrationId,
  label: z.string(),
  configured: z.boolean(),
  accountLabel: z.string().optional(),
  createdAt: z.number().optional(),
});
export type Integration = z.infer<typeof Integration>;