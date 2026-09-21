import type { ChatChunk, ChatRequest, ChatResult, ModelInfo, ProviderId } from '@tj-cortex/shared';
import { BaseProvider } from './base.js';
import { KEYCHAIN_KEYS } from './keychain.js';
import { ProviderError, type Provider, type ProviderContext } from './types.js';

/**
 * Ollama — local models via Ollama's HTTP API (OpenAI-compatible at /v1).
 * No API key. Base URL configurable (default http://127.0.0.1:11434).
 */
export class OllamaProvider extends BaseProvider implements Provider {
  readonly id: ProviderId = 'ollama';
  readonly name = 'Ollama';
  readonly authMode = 'none' as const;

  private async base(ctx: ProviderContext): Promise<string> {
    return (await ctx.getSecret(KEYCHAIN_KEYS.providerBaseUrl('ollama'))) ?? 'http://127.0.0.1:11434';
  }

  async isConfigured(): Promise<boolean> {
    return true; // local, always "configured" — health check verifies reachability
  }

  async health(ctx: ProviderContext) {
    try {
      const base = await this.base(ctx);
      const r = await fetch(`${base}/api/tags`);
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async listModels(ctx?: ProviderContext): Promise<ModelInfo[]> {
    if (!ctx) return [];
    try {
      const base = await this.base(ctx);
      const r = await fetch(`${base}/api/tags`);
      if (!r.ok) return [];
      const j = (await r.json()) as { models?: { name: string }[] };
      return (j.models ?? []).map((m) => ({
        providerId: 'ollama',
        id: m.name,
        label: m.name,
        supportsTools: true,
        supportsVision: /llava|vision|llama3.2-vision/.test(m.name),
        supportsReasoning: /deepseek-r1|reason/.test(m.name),
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
      usage, costUsd: 0, model: req.model, providerId: 'ollama', finishReason, requestId: req.requestId,
    };
  }

  async *stream(ctx: ProviderContext, req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatChunk> {
    const base = await this.base(ctx);
    const body: any = {
      model: req.model,
      messages: req.messages,
      stream: true,
      options: {
        temperature: req.temperature,
        top_p: req.topP,
        num_predict: req.maxTokens,
        stop: req.stop,
      },
    };
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new ProviderError('ollama', 'network', `Ollama HTTP ${res.status}: ${t.slice(0, 200)}`, true);
    }
    if (!res.body) throw new ProviderError('ollama', 'network', 'No response body', true);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let inTok = 0;
    let outTok = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        let json: any;
        try { json = JSON.parse(line); } catch { continue; }
        const msg = json.message ?? {};
        const text = typeof msg.content === 'string' ? msg.content : '';
        const reasoning = typeof msg.thinking === 'string' ? msg.thinking : '';
        if (text || reasoning) yield { delta: text, reasoningDelta: reasoning };
        if (Array.isArray(msg.tool_calls)) {
          for (const [i, tc] of msg.tool_calls.entries()) {
            yield {
              delta: '', reasoningDelta: '',
              toolCallDelta: {
                index: i,
                id: `call_${i}`,
                name: tc.function?.name,
                argumentsDelta: JSON.stringify(tc.function?.arguments ?? {}),
              },
            };
          }
        }
        if (json.prompt_eval_count) inTok = json.prompt_eval_count;
        if (json.eval_count) outTok = json.eval_count;
        if (json.done) {
          yield {
            delta: '', reasoningDelta: '', finishReason: 'stop',
            usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
            costUsd: 0,
          };
        }
      }
    }
  }
}