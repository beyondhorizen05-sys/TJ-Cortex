import type { ChatChunk, ChatRequest, ChatResult, ModelInfo, ProviderId } from '@tj-cortex/shared';
import { BaseProvider, parseSSE } from './base.js';
import { KEYCHAIN_KEYS } from './keychain.js';
import { computeCostUsd } from './cost.js';
import { ProviderError, type Provider, type ProviderContext } from './types.js';

/**
 * Any OpenAI-compatible API. Requires a base URL. Optional API key.
 * Examples: vLLM, LM Studio, Together, Groq, Fireworks, local proxies.
 */
export class OpenAICompatProvider extends BaseProvider implements Provider {
  readonly id: ProviderId = 'openai-compat';
  readonly name = 'OpenAI-compatible';
  readonly authMode = 'api_key' as const;

  async isConfigured(ctx: ProviderContext) {
    const base = await ctx.getSecret(KEYCHAIN_KEYS.providerBaseUrl('openai-compat'));
    return Boolean(base);
  }

  async listModels(ctx?: ProviderContext): Promise<ModelInfo[]> {
    if (!ctx) return [];
    const base = await ctx.getSecret(KEYCHAIN_KEYS.providerBaseUrl('openai-compat'));
    const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('openai-compat'));
    if (!base) return [];
    try {
      const r = await fetch(`${base.replace(/\/$/, '')}/models`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
      });
      if (!r.ok) return [];
      const j = (await r.json()) as { data?: { id: string }[] };
      return (j.data ?? []).map((m) => ({
        providerId: 'openai-compat',
        id: m.id,
        label: m.id,
        supportsTools: true,
        supportsVision: false,
        supportsReasoning: false,
        inputPer1M: 0,
        outputPer1M: 0,
        currency: 'USD',
      }));
    } catch {
      return [];
    }
  }

  async chat(ctx: ProviderContext, req: ChatRequest): Promise<ChatResult> {
    let text = '';
    let reasoning = '';
    const toolCalls: ChatResult['toolCalls'] = [];
    let finishReason: ChatResult['finishReason'] = 'stop';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    for await (const c of this.stream(ctx, req)) {
      text += c.delta;
      reasoning += c.reasoningDelta;
      if (c.toolCallDelta) {
        const i = c.toolCallDelta.index;
        toolCalls[i] ??= { id: '', name: '', arguments: '' };
        if (c.toolCallDelta.id) toolCalls[i]!.id = c.toolCallDelta.id;
        if (c.toolCallDelta.name) toolCalls[i]!.name = c.toolCallDelta.name;
        if (c.toolCallDelta.argumentsDelta) toolCalls[i]!.arguments += c.toolCallDelta.argumentsDelta;
      }
      if (c.finishReason) finishReason = c.finishReason;
      if (c.usage) {
        usage = {
          inputTokens: c.usage.inputTokens ?? usage.inputTokens,
          outputTokens: c.usage.outputTokens ?? usage.outputTokens,
          totalTokens: (c.usage.inputTokens ?? 0) + (c.usage.outputTokens ?? 0),
        };
      }
    }
    return {
      text, reasoning: reasoning || undefined, toolCalls: toolCalls.filter(Boolean),
      usage, costUsd: computeCostUsd(req.model, usage),
      model: req.model, providerId: 'openai-compat', finishReason, requestId: req.requestId,
    };
  }

  async *stream(ctx: ProviderContext, req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk> {
    const base = await ctx.getSecret(KEYCHAIN_KEYS.providerBaseUrl('openai-compat'));
    const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('openai-compat'));
    if (!base) throw new ProviderError('openai-compat', 'auth_missing', 'Base URL required.');

    const body: any = {
      model: req.model,
      messages: req.messages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: req.temperature,
      top_p: req.topP,
      max_tokens: req.maxTokens,
      stop: req.stop,
    };
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = req.toolChoice ?? 'auto';
    }

    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new ProviderError(
        'openai-compat',
        res.status === 401 ? 'auth_invalid' : res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server' : 'bad_request',
        `HTTP ${res.status}: ${t.slice(0, 400)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    let inTok = 0;
    let outTok = 0;
    for await (const data of parseSSE(res.body, signal)) {
      if (data === '[DONE]') {
        yield {
          delta: '', reasoningDelta: '', finishReason: 'stop',
          usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
        };
        return;
      }
      let json: any;
      try { json = JSON.parse(data); } catch { continue; }
      const choice = json.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};
      const text = typeof delta.content === 'string' ? delta.content : '';
      const reasoning = typeof delta.reasoning_content === 'string' ? delta.reasoning_content
        : typeof delta.reasoning === 'string' ? delta.reasoning : '';
      if (text || reasoning) yield { delta: text, reasoningDelta: reasoning };
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          yield {
            delta: '', reasoningDelta: '',
            toolCallDelta: { index: tc.index ?? 0, id: tc.id, name: tc.function?.name, argumentsDelta: tc.function?.arguments },
          };
        }
      }
      if (json.usage) {
        inTok = json.usage.prompt_tokens ?? inTok;
        outTok = json.usage.completion_tokens ?? outTok;
      }
      if (choice.finish_reason) {
        const fr: ChatResult['finishReason'] =
          choice.finish_reason === 'tool_calls' ? 'tool_calls' :
          choice.finish_reason === 'length' ? 'length' : 'stop';
        yield {
          delta: '', reasoningDelta: '', finishReason: fr,
          usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
        };
      }
    }
  }
}