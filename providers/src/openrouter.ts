import type { ChatChunk, ChatRequest, ChatResult, ModelInfo, ProviderId } from '@tj-cortex/shared';
import { BaseProvider, parseSSE } from './base.js';
import { KEYCHAIN_KEYS } from './keychain.js';
import { computeCostUsd } from './cost.js';
import { ProviderError, type Provider, type ProviderContext } from './types.js';

/**
 * OpenRouter — OpenAI-compatible, but routes to many models. We use the same
 * OpenAI request shape and include OpenRouter's optional headers.
 */
export class OpenRouterProvider extends BaseProvider implements Provider {
  readonly id: ProviderId = 'openrouter';
  readonly name = 'OpenRouter';
  readonly authMode = 'api_key' as const;

  async isConfigured(ctx: ProviderContext) {
    return Boolean(await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('openrouter')));
  }

  async listModels(): Promise<ModelInfo[]> {
    // A pragmatic subset. The UI fetches the full list from /models via the
    // sidecar on first launch.
    return [
      { providerId: 'openrouter', id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (OR)',
        supportsTools: true, supportsVision: true, supportsReasoning: false, inputPer1M: 3, outputPer1M: 15, currency: 'USD' },
      { providerId: 'openrouter', id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (OR)',
        supportsTools: true, supportsVision: true, supportsReasoning: false, inputPer1M: 0.15, outputPer1M: 0.6, currency: 'USD' },
      { providerId: 'openrouter', id: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (OR)',
        supportsTools: true, supportsVision: false, supportsReasoning: false, inputPer1M: 0.27, outputPer1M: 1.1, currency: 'USD' },
      { providerId: 'openrouter', id: 'deepseek/deepseek-reasoner', label: 'DeepSeek R1 (OR)',
        supportsTools: false, supportsVision: false, supportsReasoning: true, inputPer1M: 0.55, outputPer1M: 2.19, currency: 'USD' },
    ];
  }

  async chat(ctx: ProviderContext, req: ChatRequest): Promise<ChatResult> {
    let text = '';
    let reasoning = '';
    const toolCalls: ChatResult['toolCalls'] = [];
    let finishReason: ChatResult['finishReason'] = 'stop';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let costUsd = 0;
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
      if (typeof c.costUsd === 'number') costUsd = c.costUsd;
    }
    return {
      text, reasoning: reasoning || undefined, toolCalls: toolCalls.filter(Boolean),
      usage, costUsd, model: req.model, providerId: 'openrouter', finishReason, requestId: req.requestId,
    };
  }

  async *stream(ctx: ProviderContext, req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk> {
    const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('openrouter'));
    if (!key) throw new ProviderError('openrouter', 'auth_missing', 'OpenRouter API key not set.');

    const body: any = {
      model: req.model,
      messages: req.messages.map((m) => {
        const out: any = { role: m.role, content: m.content };
        if (m.name) out.name = m.name;
        if (m.toolCallId) out.tool_call_id = m.toolCallId;
        if (m.toolCalls)
          out.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments },
          }));
        return out;
      }),
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

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://tj-cortex.app',
        'X-Title': 'TJ-Cortex',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new ProviderError(
        'openrouter',
        res.status === 401 ? 'auth_invalid' : res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server' : 'bad_request',
        `OpenRouter HTTP ${res.status}: ${t.slice(0, 400)}`,
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
          costUsd: computeCostUsd(req.model, { inputTokens: inTok, outputTokens: outTok }),
        };
        return;
      }
      let json: any;
      try { json = JSON.parse(data); } catch { continue; }
      const choice = json.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};
      const text = typeof delta.content === 'string' ? delta.content : '';
      const reasoning = typeof delta.reasoning === 'string' ? delta.reasoning : '';
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
          choice.finish_reason === 'length' ? 'length' :
          choice.finish_reason === 'content_filter' ? 'content_filter' : 'stop';
        yield {
          delta: '', reasoningDelta: '', finishReason: fr,
          usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
          costUsd: computeCostUsd(req.model, { inputTokens: inTok, outputTokens: outTok }),
        };
      }
    }
  }
}