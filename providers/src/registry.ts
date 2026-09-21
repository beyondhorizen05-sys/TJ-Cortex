import type { ProviderId, ProviderStatus } from '@tj-cortex/shared';
import { AnthropicProvider } from './anthropic.js';
import { DeepSeekProvider } from './deepseek.js';
import { GeminiProvider } from './gemini.js';
import { OllamaProvider } from './ollama.js';
import { OpenAICompatProvider } from './openai-compat.js';
import { OpenAIProvider } from './openai.js';
import { OpenRouterProvider } from './openrouter.js';
import type { Provider, ProviderContext } from './types.js';

export class ProviderRegistry {
  private providers = new Map<ProviderId, Provider>();

  constructor() {
    for (const p of [
      new GeminiProvider(),
      new DeepSeekProvider(),
      new OpenAIProvider(),
      new AnthropicProvider(),
      new OpenRouterProvider(),
      new OllamaProvider(),
      new OpenAICompatProvider(),
    ] as Provider[]) {
      this.providers.set(p.id, p);
    }
  }

  get(id: ProviderId): Provider {
    const p = this.providers.get(id);
    if (!p) throw new Error(`Unknown provider: ${id}`);
    return p;
  }

  list(): Provider[] {
    return [...this.providers.values()];
  }

  async statuses(ctx: ProviderContext): Promise<ProviderStatus[]> {
    const out: ProviderStatus[] = [];
    for (const p of this.providers.values()) {
      const configured = await p.isConfigured(ctx).catch(() => false);
      let health: ProviderStatus['health'] = 'unknown';
      let lastError: string | undefined;
      let accountEmail: string | undefined;
      if (configured && p.health) {
        try {
          const h = await p.health(ctx);
          health = h.ok ? 'ok' : 'error';
          lastError = h.error;
          accountEmail = h.accountEmail;
        } catch (e) {
          health = 'error';
          lastError = (e as Error).message;
        }
      }
      out.push({
        providerId: p.id,
        configured,
        authMode: p.authMode,
        health,
        lastError,
        lastCheckedAt: Date.now(),
        accountEmail,
      });
    }
    return out;
  }
}