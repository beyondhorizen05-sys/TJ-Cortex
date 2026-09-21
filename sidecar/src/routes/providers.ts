import type { FastifyInstance } from 'fastify';
import { ProviderRegistry, KEYCHAIN_KEYS } from '@tj-cortex/providers';
import { createProviderContext } from '../context.js';
import { getKeychain } from '../keychain.js';
import { broadcast } from '../ws.js';
import { WS_EVENTS } from '@tj-cortex/shared';
import { logger } from '../logger.js';

const registry = new ProviderRegistry();
const ctx = createProviderContext();

export async function registerProviderRoutes(app: FastifyInstance) {
  app.get('/providers', async () => {
    const statuses = await registry.statuses(ctx);
    return statuses;
  });

  app.get('/providers/:id/models', async (req) => {
    const { id } = req.params as { id: string };
    const provider = registry.get(id as any);
    const models = await provider.listModels();
    return models;
  });

  /**
   * Set an API key for a provider. The key is written to the OS keychain and
   * never echoed back. The response only confirms configuration.
   */
  app.post('/providers/:id/key', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { apiKey } = req.body as { apiKey?: string };
    if (!apiKey || apiKey.length < 8) {
      return reply.code(400).send({ error: 'apiKey is required' });
    }
    await getKeychain().set(KEYCHAIN_KEYS.providerApiKey(id), apiKey);
    logger.info({ provider: id }, 'provider api key set');
    broadcast(WS_EVENTS.ProviderStatus, { providerId: id, configured: true });
    return { ok: true };
  });

  app.delete('/providers/:id/key', async (req) => {
    const { id } = req.params as { id: string };
    await getKeychain().delete(KEYCHAIN_KEYS.providerApiKey(id));
    broadcast(WS_EVENTS.ProviderStatus, { providerId: id, configured: false });
    return { ok: true };
  });

  app.post('/providers/:id/base-url', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { baseUrl } = req.body as { baseUrl?: string };
    if (!baseUrl) return reply.code(400).send({ error: 'baseUrl is required' });
    await getKeychain().set(KEYCHAIN_KEYS.providerBaseUrl(id), baseUrl);
    return { ok: true };
  });

  app.post('/providers/:id/health', async (req, reply) => {
    const { id } = req.params as { id: string };
    const provider = registry.get(id as any);
    if (!provider.health) return reply.code(400).send({ error: 'provider has no health probe' });
    const res = await provider.health(ctx);
    return res;
  });
}