import { z } from 'zod';

export const ProviderId = z.enum([
  'gemini',
  'deepseek',
  'openai',
  'anthropic',
  'openrouter',
  'ollama',
  'openai-compat',
]);
export type ProviderId = z.infer<typeof ProviderId>;

export const ProviderAuthMode = z.enum(['api_key', 'oauth_google', 'none']);
export type ProviderAuthMode = z.infer<typeof ProviderAuthMode>;

export const ModelInfo = z.object({
  providerId: ProviderId,
  id: z.string(),
  label: z.string(),
  contextWindow: z.number().optional(),
  supportsTools: z.boolean().default(false),
  supportsVision: z.boolean().default(false),
  supportsReasoning: z.boolean().default(false), // surfaces `reasoning_content`
  inputPer1M: z.number().nonnegative().default(0),
  outputPer1M: z.number().nonnegative().default(0),
  currency: z.literal('USD').default('USD'),
});
export type ModelInfo = z.infer<typeof ModelInfo>;

export const ProviderStatus = z.object({
  providerId: ProviderId,
  configured: z.boolean(),
  authMode: ProviderAuthMode,
  health: z.enum(['unknown', 'ok', 'error']).default('unknown'),
  lastError: z.string().optional(),
  lastCheckedAt: z.number().optional(),
  accountEmail: z.string().optional(), // when authed via Google Sign-In
});
export type ProviderStatus = z.infer<typeof ProviderStatus>;

export const ProviderConfig = z.object({
  providerId: ProviderId,
  authMode: ProviderAuthMode.default('api_key'),
  baseUrl: z.string().url().optional(),
  defaultModelId: z.string().optional(),
  // Never store secrets here. Secrets live in the OS keychain.
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

export const ChatRole = z.enum(['system', 'user', 'assistant', 'tool']);
export type ChatRole = z.infer<typeof ChatRole>;

export const ChatMessage = z.object({
  role: ChatRole,
  content: z.string().default(''),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.string(),
      }),
    )
    .optional(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const ToolSpec = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()),
});
export type ToolSpec = z.infer<typeof ToolSpec>;

export const ChatRequest = z.object({
  model: z.string(),
  messages: z.array(ChatMessage),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  tools: z.array(ToolSpec).optional(),
  toolChoice: z.enum(['auto', 'none', 'required']).optional(),
  stop: z.array(z.string()).optional(),
  // Provider-agnostic request id for cancellation + telemetry-free tracing.
  requestId: z.string().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export const ChatUsage = z.object({
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  reasoningTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().default(0),
});
export type ChatUsage = z.infer<typeof ChatUsage>;

export const ChatResult = z.object({
  text: z.string(),
  reasoning: z.string().optional(),
  toolCalls: z.array(
    z.object({ id: z.string(), name: z.string(), arguments: z.string() }),
  ),
  usage: ChatUsage,
  costUsd: z.number().nonnegative(),
  model: z.string(),
  providerId: ProviderId,
  finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter', 'error']),
  requestId: z.string().optional(),
});
export type ChatResult = z.infer<typeof ChatResult>;

export const ChatChunk = z.object({
  delta: z.string().default(''),
  reasoningDelta: z.string().default(''),
  toolCallDelta: z
    .object({
      index: z.number().int().nonnegative(),
      id: z.string().optional(),
      name: z.string().optional(),
      argumentsDelta: z.string().optional(),
    })
    .optional(),
  finishReason: z
    .enum(['stop', 'length', 'tool_calls', 'content_filter', 'error'])
    .optional(),
  usage: ChatUsage.partial().optional(),
  costUsd: z.number().nonnegative().optional(),
});
export type ChatChunk = z.infer<typeof ChatChunk>;