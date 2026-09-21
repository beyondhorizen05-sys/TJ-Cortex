/**
 * Keychain abstraction. Concrete implementation lives in the sidecar and
 * wraps the `keytar` npm module (Windows Credential Vault / libsecret).
 * Providers only ever see this interface, never the underlying store.
 */
export interface KeychainAdapter {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/** In-memory keychain — used by tests and as a fallback when keytar is unavailable. */
export class MemoryKeychain implements KeychainAdapter {
  private store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key);
  }
  async set(key: string, value: string) {
    this.store.set(key, value);
  }
  async delete(key: string) {
    this.store.delete(key);
  }
}

export const KEYCHAIN_KEYS = {
  providerApiKey: (providerId: string) => `tj-cortex.provider.${providerId}.api_key`,
  providerBaseUrl: (providerId: string) => `tj-cortex.provider.${providerId}.base_url`,
  googleAccessToken: 'tj-cortex.google.access_token',
  googleRefreshToken: 'tj-cortex.google.refresh_token',
  googleEmail: 'tj-cortex.google.email',
  googleExpiresAt: 'tj-cortex.google.expires_at',
  googleClientId: 'tj-cortex.google.client_id',
  googleClientSecret: 'tj-cortex.google.client_secret',
} as const;