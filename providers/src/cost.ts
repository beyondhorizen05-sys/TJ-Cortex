import type { ChatUsage, ModelInfo } from '@tj-cortex/shared';

/**
 * Price table. Values are USD per 1M tokens and reflect published rates at the
 * time of writing. They are updated in `PRICING_LAST_UPDATED` and are treated
 * as advisory — the ledger always records the exact computed cost per call.
 */
export const PRICING_LAST_UPDATED = '2025-01-01';

export const PRICING: Record<string, { input: number; output: number }> = {
  // Google Gemini
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.3 },
  'gemini-2.0-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },

  // DeepSeek
  'deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },

  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'o4-mini': { input: 1.1, output: 4.4 },

  // Anthropic
  'claude-3-5-sonnet-latest': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-latest': { input: 0.8, output: 4.0 },
  'claude-3-7-sonnet-latest': { input: 3.0, output: 15.0 },
};

/** Free tier: cost is zero but we still count tokens for the dashboard. */
export function computeCostUsd(
  modelId: string,
  usage: Pick<ChatUsage, 'inputTokens' | 'outputTokens'>,
  opts?: { freeTier?: boolean },
): number {
  if (opts?.freeTier) return 0;
  const price = PRICING[modelId];
  if (!price) return 0;
  const inCost = (usage.inputTokens / 1_000_000) * price.input;
  const outCost = (usage.outputTokens / 1_000_000) * price.output;
  return Number((inCost + outCost).toFixed(6));
}

/** A rolling per-conversation cost accumulator. */
export class CostTracker {
  private byProvider = new Map<string, { usd: number; tokens: number }>();
  private byAgent = new Map<string, { usd: number; tokens: number }>();

  add(providerId: string, agentId: string, usd: number, tokens: number) {
    const p = this.byProvider.get(providerId) ?? { usd: 0, tokens: 0 };
    p.usd += usd;
    p.tokens += tokens;
    this.byProvider.set(providerId, p);

    const a = this.byAgent.get(agentId) ?? { usd: 0, tokens: 0 };
    a.usd += usd;
    a.tokens += tokens;
    this.byAgent.set(agentId, a);
  }

  snapshot() {
    return {
      providers: Object.fromEntries(this.byProvider),
      agents: Object.fromEntries(this.byAgent),
    };
  }
}

export function modelInfo(providerId: string, id: string): ModelInfo {
  const price = PRICING[id] ?? { input: 0, output: 0 };
  return {
    providerId: providerId as ModelInfo['providerId'],
    id,
    label: id,
    supportsTools: true,
    supportsVision: /flash|vision|gpt-4o|sonnet|pro|1\.5/.test(id),
    supportsReasoning: id === 'deepseek-reasoner' || id.startsWith('o'),
    inputPer1M: price.input,
    outputPer1M: price.output,
    currency: 'USD',
  };
}