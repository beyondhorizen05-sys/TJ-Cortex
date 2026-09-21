import type { FastifyInstance } from 'fastify';
import { googleSignIn } from '@tj-cortex/providers';
import { KEYCHAIN_KEYS } from '@tj-cortex/providers';
import open from 'open';
import { config } from '../config.js';
import { getKeychain } from '../keychain.js';
import { logger } from '../logger.js';

/**
 * Google Sign-In routes.
 *
 * GET  /auth/google/status  -> { configured, email }
 * POST /auth/google/signin  -> opens browser, awaits callback, stores tokens
 * POST /auth/google/signout -> clears tokens
 * POST /auth/google/client  -> set client_id / client_secret (optional)
 */
export async function registerGoogleAuthRoutes(app: FastifyInstance) {
  const kc = getKeychain();

  app.get('/auth/google/status', async () => {
    const email = await kc.get(KEYCHAIN_KEYS.googleEmail);
    const refresh = await kc.get(KEYCHAIN_KEYS.googleRefreshToken);
    const clientId = await kc.get(KEYCHAIN_KEYS.googleClientId);
    return { configured: Boolean(refresh && clientId), email };
  });

  app.post('/auth/google/client', async (req, reply) => {
    const { clientId, clientSecret } = req.body as { clientId?: string; clientSecret?: string };
    if (!clientId) return reply.code(400).send({ error: 'clientId is required' });
    await kc.set(KEYCHAIN_KEYS.googleClientId, clientId);
    if (clientSecret) await kc.set(KEYCHAIN_KEYS.googleClientSecret, clientSecret);
    return { ok: true };
  });

  app.post('/auth/google/signin', async (req, reply) => {
    const clientId = (await kc.get(KEYCHAIN_KEYS.googleClientId)) ?? config.googleClientId;
    const clientSecret =
      (await kc.get(KEYCHAIN_KEYS.googleClientSecret)) ?? config.googleClientSecret;
    if (!clientId) {
      return reply.code(400).send({ error: 'Google client_id is not configured. Set it in Settings.' });
    }
    try {
      const tokens = await googleSignIn({
        clientId,
        clientSecret: clientSecret || undefined,
        openBrowser: async (url) => {
          await open(url);
        },
        timeoutMs: 5 * 60_000,
      });
      await kc.set(KEYCHAIN_KEYS.googleAccessToken, tokens.accessToken);
      await kc.set(KEYCHAIN_KEYS.googleExpiresAt, String(tokens.expiresAt));
      if (tokens.refreshToken) await kc.set(KEYCHAIN_KEYS.googleRefreshToken, tokens.refreshToken);
      if (tokens.email) await kc.set(KEYCHAIN_KEYS.googleEmail, tokens.email);
      logger.info({ email: tokens.email }, 'google sign-in success');
      return { ok: true, email: tokens.email };
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'google sign-in failed');
      return reply.code(500).send({ error: (e as Error).message });
    }
  });

  app.post('/auth/google/signout', async () => {
    await kc.delete(KEYCHAIN_KEYS.googleAccessToken);
    await kc.delete(KEYCHAIN_KEYS.googleExpiresAt);
    await kc.delete(KEYCHAIN_KEYS.googleRefreshToken);
    await kc.delete(KEYCHAIN_KEYS.googleEmail);
    return { ok: true };
  });
}