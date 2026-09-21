import keytar from 'keytar';
import { logger } from './logger.js';
import type { KeychainAdapter } from '@tj-cortex/providers';

const SERVICE = 'tj-cortex';

/**
 * OS keychain adapter backed by `keytar`:
 *   Windows -> Credential Vault
 *   macOS   -> Keychain
 *   Linux   -> libsecret (gnome-keyring, etc.)
 *
 * Secrets are only ever read inside the sidecar. The UI never receives them.
 */
class KeytarKeychain implements KeychainAdapter {
  async get(key: string): Promise<string | undefined> {
    try {
      const v = await keytar.getPassword(SERVICE, key);
      return v ?? undefined;
    } catch (e) {
      logger.warn({ key, err: (e as Error).message }, 'keychain.get failed');
      return undefined;
    }
  }
  async set(key: string, value: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE, key, value);
    } catch (e) {
      logger.error({ key, err: (e as Error).message }, 'keychain.set failed');
      throw e;
    }
  }
  async delete(key: string): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE, key);
    } catch (e) {
      logger.warn({ key, err: (e as Error).message }, 'keychain.delete failed');
    }
  }
}

let instance: KeychainAdapter | null = null;
export function getKeychain(): KeychainAdapter {
  if (!instance) instance = new KeytarKeychain();
  return instance;
}