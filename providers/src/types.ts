import type {
  ChatRequest,
  ChatResult,
  ChatChunk,
  ModelInfo,
  ProviderId,
  ProviderAuthMode,
} from '@tj-cortex/shared';

export interface ProviderContext {
  /** Retrieve a stored secret by key. Keys are namespaced by provider. */
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
  /** Called when a provider refreshes an access token. */
  log?(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void;
}

export interface Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly authMode: ProviderAuthMode;

  /** Return true if secrets/config are present and usable. */
  isConfigured(ctx: ProviderContext): Promise<boolean>;

  listModels(): Promise<ModelInfo[]>;
  chat(ctx: ProviderContext, req: ChatRequest): Promise<ChatResult>;
  stream(ctx: ProviderContext, req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk>;

  /** Optional health probe; safe to skip. */
  health?(ctx: ProviderContext): Promise<{ ok: boolean; error?: string; accountEmail?: string }>;
}

export class ProviderError extends Error {
  constructor(
    public providerId: ProviderId,
    public code:
      | 'auth_missing'
      | 'auth_invalid'
      | 'rate_limited'
      | 'network'
      | 'bad_request'
      | 'server'
      | 'unsupported'
      | 'cancelled'
      | 'unknown',
    message: string,
    public retryable = false,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}