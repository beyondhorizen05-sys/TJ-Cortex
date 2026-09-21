import type { ProviderContext } from '@tj-cortex/providers';
import { getKeychain } from './keychain.js';
import { logger } from './logger.js';

/**
 * ProviderContext implementation: secrets flow to providers only from the
 * keychain. Any logging a provider does flows through pino, never to the wire.
 */
export function createProviderContext(): ProviderContext {
  const kc = getKeychain();
  return {
    getSecret: (key) => kc.get(key),
    setSecret: (key, value) => kc.set(key, value),
    deleteSecret: (key) => kc.delete(key),
    log: (level, message, meta) =>
      logger[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info'](
        { provider: meta },
        message,
      ),
  };
}