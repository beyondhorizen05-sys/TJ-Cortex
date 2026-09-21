import type { ChatChunk, ChatRequest, ChatResult, ProviderId } from '@tj-cortex/shared';
import type { Provider, ProviderContext } from './types.js';
import { ProviderError } from './types.js';

export interface FallbackStep {
  providerId: ProviderId;
  model: string;
}

export interface FallbackChain {
  /** Ordered list. First entry is the primary. */
  steps: FallbackStep[];
  /** Max retries per step for retryable errors. */
  retriesPerStep?: number;
  /** Called between attempts. */
  onFallback?: (from: FallbackStep, to: FallbackStep, reason: string) => void;
}

/**
 * Run a chat request against a fallback chain. Retries retryable errors within
 * a step, then moves to the next step. Never silently succeeds: the caller
 * always sees which step actually answered.
 */
export async function chatWithFallback(
  getProvider: (id: ProviderId) => Provider,
  ctx: ProviderContext,
  chain: FallbackChain,
  req: Omit<ChatRequest, 'model'>,
): Promise<ChatResult & { usedStep: FallbackStep }> {
  const retries = chain.retriesPerStep ?? 1;
  let lastErr: unknown;
  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i]!;
    const provider = getProvider(step.providerId);
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await provider.chat(ctx, { ...req, model: step.model });
        return { ...res, usedStep: step };
      } catch (e) {
        lastErr = e;
        const retryable = e instanceof ProviderError && e.retryable;
        if (!retryable || attempt === retries) {
          const next = chain.steps[i + 1];
          if (next && chain.onFallback) {
            chain.onFallback(step, next, (e as Error).message);
          }
          break;
        }
        await sleep(400 * (attempt + 1));
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new ProviderError('openai', 'unknown', String(lastErr));
}

export async function* streamWithFallback(
  getProvider: (id: ProviderId) => Provider,
  ctx: ProviderContext,
  chain: FallbackChain,
  req: Omit<ChatRequest, 'model'>,
  signal?: AbortSignal,
): AsyncIterable<ChatChunk & { usedStep?: FallbackStep }> {
  const retries = chain.retriesPerStep ?? 1;
  let lastErr: unknown;
  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i]!;
    const provider = getProvider(step.providerId);
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let first = true;
        for await (const chunk of provider.stream(ctx, { ...req, model: step.model }, signal)) {
          if (first) {
            yield { ...chunk, usedStep: step };
            first = false;
          } else {
            yield chunk;
          }
        }
        return;
      } catch (e) {
        lastErr = e;
        const retryable = e instanceof ProviderError && e.retryable;
        if (!retryable || attempt === retries) {
          const next = chain.steps[i + 1];
          if (next && chain.onFallback) chain.onFallback(step, next, (e as Error).message);
          break;
        }
        await sleep(400 * (attempt + 1));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new ProviderError('openai', 'unknown', String(lastErr));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}