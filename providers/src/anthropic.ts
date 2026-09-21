import type { ChatChunk, ChatRequest, ChatResult, ModelInfo, ProviderId } from '@tj-cortex/shared';
import { BaseProvider, parseSSE } from './base.js';
import { KEYCHAIN_KEYS } from './keychain.js';
import { computeCostUsd } from './cost.js';
import { ProviderError, type Provider, type ProviderContext } from './types.js';

export class AnthropicProvider extends BaseProvider implements Provider {
  readonly id: ProviderId = 'anthropic';
  readonly name = 'Anthropic';
  readonly authMode = 'api_key' as const;

  async isConfigured(ctx: ProviderContext) {
    return Boolean(await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('anthropic')));
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { providerId: 'anthropic', id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet',
        contextWindow: 200_000, supportsTools: true, supportsVision: true, supportsReasoning: false,
        inputPer1M: 3, outputPer1M: 15, currency: 'USD' },
      { providerId: 'anthropic', id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku',
        contextWindow: 200_000, supportsTools: true, supportsVision: true, supportsReasoning: false,
        inputPer1M: 0.8, outputPer1M: 4, currency: 'USD' },
      { providerId: 'anthropic', id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet',
        contextWindow: 200_000, supportsTools: true, supportsVision: true, supportsReasoning: true,
        inputPer1M: 3, outputPer1M: 15, currency: 'USD' },
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
      usage, costUsd, model: req.model, providerId: 'anthropic', finishReason, requestId: req.requestId,
    };
  }

  async *stream(ctx: ProviderContext, req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk> {
    const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('anthropic'));
    if (!key) throw new ProviderError('anthropic', 'auth_missing', 'Anthropic API key not set.');

    const system = req.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const messages = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'tool' ? 'user' : (m.role as 'user' | 'assistant'),
        content: m.content,
      }));

    const body: any = {
      model: req.model,
      messages,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature,
      top_p: req.topP,
      stop_sequences: req.stop,
      stream: true,
    };
    if (system) body.system = system;
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new ProviderError(
        'anthropic',
        res.status === 401 ? 'auth_invalid' : res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server' : 'bad_request',
        `Anthropic HTTP ${res.status}: ${t.slice(0, 400)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    let inTok = 0;
    let outTok = 0;
    let currentToolIndex = 0;
    let currentTool: { id: string; name: string } | null = null;

    for await (const data of parseSSE(res.body, signal)) {
      let json: any;
      try { json = JSON.parse(data); } catch { continue; }
      const type = json.type;
      if (type === 'content_block_start' && json.content_block?.type === 'tool_use') {
        currentTool = { id: json.content_block.id, name: json.content_block.name };
        yield {
          delta: '', reasoningDelta: '',
          toolCallDelta: { index: currentToolIndex, id: currentTool.id, name: currentTool.name, argumentsDelta: '' },
        };
      } else if (type === 'content_block_delta') {
        const d = json.delta;
        if (d?.type === 'text_delta' && typeof d.text === 'string') yield { delta: d.text, reasoningDelta: '' };
        else if (d?.type === 'thinking_delta' && typeof d.thinking === 'string') yield { delta: '', reasoningDelta: d.thinking };
        else if (d?.type === 'input_json_delta' && typeof d.partial_json === 'string' && currentTool) {
          yield {
            delta: '', reasoningDelta: '',
            toolCallDelta: { index: currentToolIndex, argumentsDelta: d.partial_json },
          };
        }
      } else if (type === 'content_block_stop') {
        if (currentTool) { currentToolIndex++; currentTool = null; }
      } else if (type === 'message_delta') {
        if (json.usage) {
          inTok = json.usage.input_tokens ?? inTok;
          outTok = json.usage.output_tokens ?? outTok;
        }
        const stop = json.delta?.stop_reason;
        if (stop) {
          const fr: ChatResult['finishReason'] =
            stop === 'tool_use' ? 'tool_calls' : stop === 'max_tokens' ? 'length' :
            stop === 'end_turn' ? 'stop' : 'stop';
          yield {
            delta: '', reasoningDelta: '', finishReason: fr,
            usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
            costUsd: computeCostUsd(req.model, { inputTokens: inTok, outputTokens: outTok }),
          };
        }
      }
    }
  }
}