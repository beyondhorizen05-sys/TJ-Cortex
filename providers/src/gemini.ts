import type { ChatChunk, ChatRequest, ChatResult, ModelInfo, ProviderId } from '@tj-cortex/shared';
import { BaseProvider, parseSSE } from './base.js';
import { KEYCHAIN_KEYS } from './keychain.js';
import { computeCostUsd } from './cost.js';
import { ProviderError, type Provider, type ProviderContext } from './types.js';
import { refreshGoogleToken, type GoogleTokens } from './google-signin.js';

/**
 * Google Gemini.
 *
 * Two auth modes:
 *   - `oauth_google`: user signed in with Google; we call the Generative
 *     Language API with the user's OAuth token and get free-tier access.
 *   - `api_key`: classic `?key=...` API key.
 *
 * Both flow through the same request shape. Streaming uses `alt=sse`.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider extends BaseProvider implements Provider {
  readonly id: ProviderId = 'gemini';
  readonly name = 'Google Gemini';
  readonly authMode = 'oauth_google' as const;

  async isConfigured(ctx: ProviderContext): Promise<boolean> {
    const apiKey = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('gemini'));
    if (apiKey) return true;
    const refresh = await ctx.getSecret(KEYCHAIN_KEYS.googleRefreshToken);
    const clientId = await ctx.getSecret(KEYCHAIN_KEYS.googleClientId);
    return Boolean(refresh && clientId);
  }

  async health(ctx: ProviderContext) {
    try {
      const key = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('gemini'));
      if (key) {
        const r = await fetch(`${BASE}/models?key=${encodeURIComponent(key)}`);
        if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
        return { ok: true };
      }
      const tok = await this.accessToken(ctx);
      const r = await fetch(`${BASE}/models`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      const email = await ctx.getSecret(KEYCHAIN_KEYS.googleEmail);
      return { ok: true, accountEmail: email };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        providerId: 'gemini',
        id: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash',
        contextWindow: 1_048_576,
        supportsTools: true,
        supportsVision: true,
        supportsReasoning: false,
        inputPer1M: 0.1,
        outputPer1M: 0.4,
        currency: 'USD',
      },
      {
        providerId: 'gemini',
        id: 'gemini-2.0-pro',
        label: 'Gemini 2.0 Pro',
        contextWindow: 2_097_152,
        supportsTools: true,
        supportsVision: true,
        supportsReasoning: false,
        inputPer1M: 1.25,
        outputPer1M: 5.0,
        currency: 'USD',
      },
      {
        providerId: 'gemini',
        id: 'gemini-1.5-flash',
        label: 'Gemini 1.5 Flash',
        contextWindow: 1_048_576,
        supportsTools: true,
        supportsVision: true,
        supportsReasoning: false,
        inputPer1M: 0.075,
        outputPer1M: 0.3,
        currency: 'USD',
      },
      {
        providerId: 'gemini',
        id: 'gemini-1.5-pro',
        label: 'Gemini 1.5 Pro',
        contextWindow: 2_097_152,
        supportsTools: true,
        supportsVision: true,
        supportsReasoning: false,
        inputPer1M: 1.25,
        outputPer1M: 5.0,
        currency: 'USD',
      },
    ];
  }

  private async accessToken(ctx: ProviderContext): Promise<string | undefined> {
    const apiKey = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('gemini'));
    if (apiKey) return undefined; // API key path is separate

    const expiresAt = Number((await ctx.getSecret(KEYCHAIN_KEYS.googleExpiresAt)) ?? 0);
    if (expiresAt && expiresAt > Date.now()) {
      const t = await ctx.getSecret(KEYCHAIN_KEYS.googleAccessToken);
      if (t) return t;
    }
    const refresh = await ctx.getSecret(KEYCHAIN_KEYS.googleRefreshToken);
    const clientId = await ctx.getSecret(KEYCHAIN_KEYS.googleClientId);
    const clientSecret = await ctx.getSecret(KEYCHAIN_KEYS.googleClientSecret);
    if (!refresh || !clientId) {
      throw new ProviderError('gemini', 'auth_missing', 'Sign in with Google or paste an API key.');
    }
    const tokens: GoogleTokens = await refreshGoogleToken(clientId, refresh, clientSecret);
    await ctx.setSecret(KEYCHAIN_KEYS.googleAccessToken, tokens.accessToken);
    await ctx.setSecret(KEYCHAIN_KEYS.googleExpiresAt, String(tokens.expiresAt));
    return tokens.accessToken;
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
          totalTokens:
            (chunk.usage.inputTokens ?? 0) + (chunk.usage.outputTokens ?? 0) || usage.totalTokens,
        };
      }
      if (typeof chunk.costUsd === 'number') costUsd = chunk.costUsd;
    }

    const freeTier = Boolean(await ctx.getSecret(KEYCHAIN_KEYS.googleRefreshToken));
    const computed = computeCostUsd(req.model, usage, { freeTier });
    return {
      text,
      reasoning: reasoning || undefined,
      toolCalls: toolCalls.filter(Boolean),
      usage,
      costUsd: freeTier ? 0 : computed,
      model: req.model,
      providerId: 'gemini',
      finishReason,
      requestId: req.requestId,
    };
  }

  async *stream(
    ctx: ProviderContext,
    req: ChatRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatChunk> {
    const apiKey = await ctx.getSecret(KEYCHAIN_KEYS.providerApiKey('gemini'));
    const token = apiKey ? undefined : await this.accessToken(ctx);

    const url = new URL(`${BASE}/models/${encodeURIComponent(req.model)}:streamGenerateContent`);
    url.searchParams.set('alt', 'sse');
    if (apiKey) url.searchParams.set('key', apiKey);

    const body = {
      contents: toGeminiContents(req),
      systemInstruction: req.messages.find((m) => m.role === 'system')
        ? { role: 'system', parts: [{ text: req.messages.find((m) => m.role === 'system')!.content }] }
        : undefined,
      generationConfig: {
        temperature: req.temperature,
        topP: req.topP,
        maxOutputTokens: req.maxTokens,
        stopSequences: req.stop,
      },
      tools: req.tools?.length
        ? [
            {
              functionDeclarations: req.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: sanitizeSchema(t.parameters),
              })),
            },
          ]
        : undefined,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new ProviderError(
        'gemini',
        res.status === 401 || res.status === 403
          ? 'auth_invalid'
          : res.status === 429
            ? 'rate_limited'
            : res.status >= 500
              ? 'server'
              : 'bad_request',
        `Gemini HTTP ${res.status}: ${t.slice(0, 400)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    let inTok = 0;
    let outTok = 0;
    const toolAcc = new Map<number, { id?: string; name?: string; args: string }>();

    for await (const data of parseSSE(res.body, signal)) {
      let json: any;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const candidate = json.candidates?.[0];
      if (!candidate) continue;

      const parts: any[] = candidate.content?.parts ?? [];
      for (const p of parts) {
        if (typeof p.text === 'string') {
          yield { delta: p.text, reasoningDelta: '' };
        } else if (p.functionCall) {
          const idx = toolAcc.size;
          const id = `call_${idx}_${Math.random().toString(36).slice(2, 8)}`;
          toolAcc.set(idx, { id, name: p.functionCall.name, args: JSON.stringify(p.functionCall.args ?? {}) });
          yield {
            delta: '',
            reasoningDelta: '',
            toolCallDelta: {
              index: idx,
              id,
              name: p.functionCall.name,
              argumentsDelta: JSON.stringify(p.functionCall.args ?? {}),
            },
          };
        }
      }

      if (json.usageMetadata) {
        inTok = json.usageMetadata.promptTokenCount ?? inTok;
        outTok = json.usageMetadata.candidatesTokenCount ?? outTok;
      }

      const fr = candidate.finishReason;
      if (fr) {
        const mapped =
          fr === 'STOP'
            ? 'stop'
            : fr === 'MAX_TOKENS'
              ? 'length'
              : fr === 'SAFETY'
                ? 'content_filter'
                : 'stop';
        yield {
          delta: '',
          reasoningDelta: '',
          finishReason: mapped,
          usage: { inputTokens: inTok, outputTokens: outTok, totalTokens: inTok + outTok },
        };
      }
    }
  }
}

function toGeminiContents(req: ChatRequest) {
  return req.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  // Gemini wants OpenAPI-ish schemas; strip `$schema` and `additionalProperties`.
  const clone: any = JSON.parse(JSON.stringify(schema));
  delete clone.$schema;
  delete clone.additionalProperties;
  return clone;
}