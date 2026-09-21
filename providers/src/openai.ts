import type { ChatChunk, ChatRequest, ChatResult, ModelInfo, ProviderId } from '@tj-cortex/shared';
import { BaseProvider, parseSSE } from './base.js';
import { KEYCHAIN_KEYS } from './keychain.js';
import { computeCostUsd } from './cost.js';
import { ProviderError, type Provider, type ProviderContext } from './types.js';

export class OpenAIProvider extends BaseProvider implements Provider {
  readonly id: ProviderId = 'openai';
  readonly name = 'OpenAI';
  readonly authMode = 'api_key' as const;

  async isConfigured(ctx: ProviderContext) {
    return Boolean(await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('openai')));
  }

  async listModels(): Promise<ModelInfo[]> {
    const mk = (
      id: string,
      label: string,
      inputPer1M: number,
      outputPer1M: number,
      ctxWin = 128_000,
    ): ModelInfo => ({
      providerId: 'openai',
      id,
      label,
      contextWindow: ctxWin,
      supportsTools: true,
      supportsVision: true,
      supportsReasoning: id.startsWith('o'),
      inputPer1M,
      outputPer1M,
      currency: 'USD',
    });
    return [
      mk('gpt-4o', 'GPT-4o', 2.5, 10),
      mk('gpt-4o-mini', 'GPT-4o mini', 0.15, 0.6),
      mk('gpt-4.1', 'GPT-4.1', 2, 8),
      mk('gpt-4.1-mini', 'GPT-4.1 mini', 0.4, 1.6),
      mk('o4-mini', 'o4-mini', 1.1, 4.4),
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
      text,
      reasoning: reasoning || undefined,
      toolCalls: toolCalls.filter(Boolean),
      usage,
      costUsd,
      model: req.model,
      providerId: 'openai',
      finishReason,
      requestId: req.requestId,
    };
  }

  async *stream(ctx: ProviderContext, req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk> {
    const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('openai'));
    if (!key) throw new ProviderError('openai', 'auth_missing', 'OpenAI API key not set.');

    const body: any = {
      model: req.model,
      messages: req.messages.map((m) => {
        const out: any = { role: m.role, content: m.content };
        if (m.name) out.name = m.name;
        if (m.toolCallId) out.tool_call_id = m.toolCallId;
        if (m.toolCalls)
          out.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new ProviderError(
        'openai',
        res.status === 401 ? 'auth_invalid' : res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server' : 'bad_request',
        `OpenAI HTTP ${res.status}: ${t.slice(0, 400)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    let inTok = 0;
    let outTok = 0;
    for await (const data of parseSSE(res.body, signal)) {
      if (data === '[DONE]') {
        yield {
          delta: '',
          reasoningDelta: '',
          finishReason: 'stop',
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
            delta: '',
            reasoningDelta: '',
            toolCallDelta: {
              index: tc.index ?? 0,
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
          choice.finish_reason === 'tool_calls' ? 'tool_calls' :
          choice.finish_reason === 'length' ? 'length' :
          choice.finish_reason === 'content_filter' ? 'content_filter' : 'stop';
        yield {
          delta: '',
          reasoningDelta: '',
          finishReason: fr,
          usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
          costUsd: computeCostUsd(req.model, { inputTokens: inTok, outputTokens: outTok }),
        };
      }
    }
  }
}