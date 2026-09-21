import type { ChatRequest, ChatResult, ChatChunk, ModelInfo } from '@tj-cortex/shared';
import type { Provider, ProviderContext } from './types.js';

/** Shared SSE parsing for OpenAI-compatible streams. */
export async function* parseSSE(
  body: ReadableStream<Uint8Array> | null,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      if (signal?.aborted) throw new Error('aborted');
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of raw.split('\n')) {
          const trimmed = line.trimStart();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data) yield data;
        }
      }
    }
    if (buf.trim()) {
      for (const line of buf.split('\n')) {
        const trimmed = line.trimStart();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data) yield data;
      }
    }
  } finally {
    reader.releaseLock?.();
  }
}

export abstract class BaseProvider implements Provider {
  abstract readonly id: Provider['id'];
  abstract readonly name: string;
  abstract readonly authMode: Provider['authMode'];

  abstract isConfigured(ctx: ProviderContext): Promise<boolean>;
  abstract listModels(): Promise<ModelInfo[]>;
  abstract chat(ctx: ProviderContext, req: ChatRequest): Promise<ChatResult>;
  abstract stream(
    ctx: ProviderContext,
    req: ChatRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatChunk>;
}