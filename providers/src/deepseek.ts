import type { ChatChunk, ChatRequest, ChatResult, ModelInfo, ProviderId } from '@tj-cortex/shared';
import { BaseProvider, parseSSE } from './base.js';
import { KEYCHAIN_KEYS } from './keychain.js';
import { computeCostUsd } from './cost.js';
import { ProviderError, type Provider, type ProviderContext } from './types.js';

/**
 * DeepSeek — first-class provider.
 * OpenAI-compatible chat completions at https://api.deepseek.com.
 *
 * Models:
 *   - deepseek-chat     (V3) — tools supported, fast, cheap
 *   - deepseek-reasoner (R1) — returns `reasoning_content`, streamed into the
 *     UI's "Thinking" panel
 */
export class DeepSeekProvider extends BaseProvider implements Provider {
  readonly id: ProviderId = 'deepseek';
  readonly name = 'DeepSeek';
  readonly authMode = 'api_key' as const;

  private baseUrl(ctx: ProviderContext): Promise<string> {
    return ctx.getSecret(KEYCHAIN_KEYS.providerBaseUrl('deepseek')).then(
      (v) => v ?? 'https://api.deepseek.com',
    );
  }

  async isConfigured(ctx: ProviderContext) {
    return Boolean(await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('deepseek')));
  }

  async health(ctx: ProviderContext) {
    try {
      const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('deepseek'));
      if (!key) return { ok: false, error: 'API key not set' };
      const base = await this.baseUrl(ctx);
      const r = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        providerId: 'deepseek',
        id: 'deepseek-chat',
        label: 'DeepSeek V3 (chat)',
        contextWindow: 64_000,
        supportsTools: true,
        supportsVision: false,
        supportsReasoning: false,
        inputPer1M: 0.27,
        outputPer1M: 1.1,
        currency: 'USD',
      },
      {
        providerId: 'deepseek',
        id: 'deepseek-reasoner',
        label: 'DeepSeek R1 (reasoner)',
        contextWindow: 64_000,
        supportsTools: false, // R1 currently doesn't support tools
        supportsVision: false,
        supportsReasoning: true,
        inputPer1M: 0.55,
        outputPer1M: 2.19,
        currency: 'USD',
      },
    ];
  }

  async chat(ctx: ProviderContext, req: ChatRequest): Promise<ChatResult> {
    let text = '';
    let reasoning = '';
    const toolCalls: ChatResult['toolCalls'] = [];
    let finishReason: ChatResult['finishReason'] = 'stop';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let costUsd = 0;

    for await (const chunk of this.stream(ctx, req)) {
      text += chunk.delta;
      reasoning += chunk.reasoningDelta;
      if (chunk.toolCallDelta) {
        const i = chunk.toolCallDelta.index;
        toolCalls[i] ??= { id: '', name: '', arguments: '' };
        if (chunk.toolCallDelta.id) toolCalls[i]!.id = chunk.toolCallDelta.id;
        if (chunk.toolCallDelta.name) toolCalls[i]!.name = chunk.toolCallDelta.name;
        if (chunk.toolCallDelta.argumentsDelta)
          toolCalls[i]!.arguments += chunk.toolCallDelta.argumentsDelta;
      }
      if (chunk.finishReason) finishReason = chunk.finishReason;
      if (chunk.usage) {
        usage = {
          inputTokens: chunk.usage.inputTokens ?? usage.inputTokens,
          outputTokens: chunk.usage.outputTokens ?? usage.outputTokens,
          totalTokens: (chunk.usage.inputTokens ?? 0) + (chunk.usage.outputTokens ?? 0),
        };
      }
      if (typeof chunk.costUsd === 'number') costUsd = chunk.costUsd;
    }

    return {
      text,
      reasoning: reasoning || undefined,
      toolCalls: toolCalls.filter(Boolean),
      usage,
      costUsd,
      model: req.model,
      providerId: 'deepseek',
      finishReason,
      requestId: req.requestId,
    };
  }

  async *stream(
    ctx: ProviderContext,
    req: ChatRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatChunk> {
    const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('deepseek'));
    if (!key)
      throw new ProviderError(
        'deepseek',
        'auth_missing',
        'Paste your DeepSeek API key to enable deepseek-chat and deepseek-reasoner.',
      );
    const base = await this.baseUrl(ctx);

    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages.map((m) => {
        const out: Record<string, unknown> = { role: m.role, content: m.content };
        if (m.name) out.name = m.name;
        if (m.toolCallId) out.tool_call_id = m.toolCallId;
        if (m.toolCalls) {
          out.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
          }));
        }
        return out;
      }),
      stream: true,
      temperature: req.temperature,
      top_p: req.topP,
      max_tokens: req.maxTokens,
      stop: req.stop,
    };
    if (req.tools?.length && req.model === 'deepseek-chat') {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = req.toolChoice ?? 'auto';
    }

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new ProviderError(
        'deepseek',
        res.status === 401 || res.status === 403
          ? 'auth_invalid'
          : res.status === 429
            ? 'rate_limited'
            : res.status >= 500
              ? 'server'
              : 'bad_request',
        `DeepSeek HTTP ${res.status}: ${t.slice(0, 400)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    let inTok = 0;
    let outTok = 0;
    const toolAcc = new Map<number, { id?: string; name?: string; args: string }>();

    for await (const data of parseSSE(res.body, signal)) {
      if (data === '[DONE]') {
        const cost = computeCostUsd(req.model, { inputTokens: inTok, outputTokens: outTok });
        yield {
          delta: '',
          reasoningDelta: '',
          finishReason: 'stop',
          usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
          costUsd: cost,
        };
        return;
      }
      let json: any;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const choice = json.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta ?? {};
      const text = typeof delta.content === 'string' ? delta.content : '';
      const reasoning = typeof delta.reasoning_content === 'string' ? delta.reasoning_content : '';

      if (text || reasoning) {
        yield { delta: text, reasoningDelta: reasoning };
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const i: number = tc.index ?? 0;
          const entry = toolAcc.get(i) ?? { args: '' };
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.args += tc.function.arguments;
          toolAcc.set(i, entry);
          yield {
            delta: '',
            reasoningDelta: '',
            toolCallDelta: {
              index: i,
              id: tc.id,
              name: tc.function?.name,
              argumentsDelta: tc.function?.arguments,
            },
          };
        }
      }

      if (json.usage) {
        inTok = json.usage.prompt_tokens ?? inTok;
        outTok = json.usage.completion_tokens ?? outTok;
      }

      if (choice.finish_reason) {
        const fr: ChatResult['finishReason'] =
          choice.finish_reason === 'stop'
            ? 'stop'
            : choice.finish_reason === 'length'
              ? 'length'
              : choice.finish_reason === 'tool_calls'
                ? 'tool_calls'
                : choice.finish_reason === 'content_filter'
                  ? 'content_filter'
                  : 'stop';
        const cost = computeCostUsd(req.model, { inputTokens: inTok, outputTokens: outTok });
        yield {
          delta: '',
          reasoningDelta: '',
          finishReason: fr,
          usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
          costUsd: cost,
        };
      }
    }
  }
}