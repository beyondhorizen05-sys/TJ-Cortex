import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { ChatMessage, ChatRequest, ChatChunk } from '@tj-cortex/shared';
import { WS_EVENTS } from '@tj-cortex/shared';
import { db } from '../db/client.js';
import { agents, conversations, messages as messagesTbl, providerSpend } from '../db/schema.js';
import { ProviderRegistry, chatWithFallback, streamWithFallback } from '@tj-cortex/providers';
import type { ProviderId } from '@tj-cortex/shared';
import { createProviderContext } from '../context.js';
import { broadcast } from '../ws.js';
import { logger } from '../logger.js';
import { memorySummary, remember } from '../memory.js';
import { listTools, invokeTool } from '../tools/registry.js';

const registry = new ProviderRegistry();
const ctx = createProviderContext();

/**
 * The agent runtime. One "turn" is:
 *   1. Build the system prompt (agent identity + memories + tool list).
 *   2. Assemble prior messages from the transcript.
 *   3. Stream from the provider; broadcast deltas and reasoning deltas.
 *   4. If the model calls a tool, invoke it, append the result, and loop.
 *   5. Persist the final assistant message, cost, and any new memory.
 */

export interface RunTurnOptions {
  agentId: string;
  conversationId?: string;
  userInput: string;
  /** Fallback chain if the primary fails. */
  fallback?: { providerId: ProviderId; model: string }[];
  abortSignal?: AbortSignal;
}

export interface RunTurnResult {
  conversationId: string;
  assistantMessageId: string;
  text: string;
  reasoning?: string;
  usage: { inputTokens: number; outputTokens: number; reasoningTokens?: number };
  costUsd: number;
  providerId: string;
  model: string;
}

const MAX_TOOL_ROUNDS = 6;

export async function runTurn(opts: RunTurnOptions): Promise<RunTurnResult> {
  const agent = db.select().from(agents).where(eq(agents.id, opts.agentId)).all()[0];
  if (!agent) throw new Error(`agent not found: ${opts.agentId}`);

  const conversationId = opts.conversationId ?? (await ensureConversation(agent.id, agent.name));

  // Persist the user message.
  const userMsgId = randomUUID();
  db.insert(messagesTbl)
    .values({
      id: userMsgId,
      conversationId,
      kind: 'chat.user',
      role: 'user',
      content: opts.userInput,
      createdAt: Date.now(),
    })
    .run();
  broadcast(WS_EVENTS.MessageAdded, {
    id: userMsgId,
    conversationId,
    role: 'user',
    content: opts.userInput,
    createdAt: Date.now(),
  });

  // Build tool list (descriptors only; the schema is passed to the provider).
  const toolSpecs = listTools()
    .filter((t) => t.enabled)
    .filter((t) => (agent.boundaries.allowedTools.length ? agent.boundaries.allowedTools.includes(t.name) : true))
    .filter((t) => !agent.boundaries.deniedTools.includes(t.name))
    .map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));

  const systemPrompt = buildSystemPrompt(agent, toolSpecs.length > 0);

  let history = loadHistory(conversationId, agent.id);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: opts.userInput },
  ];

  let finalText = '';
  let finalReasoning = '';
  let totalIn = 0;
  let totalOut = 0;
  let totalReasoning = 0;
  let totalCost = 0;
  let usedProvider = agent.providerId;
  let usedModel = agent.modelId;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const req: ChatRequest = {
      model: agent.modelId,
      messages,
      tools: toolSpecs.length ? toolSpecs : undefined,
      toolChoice: toolSpecs.length ? 'auto' : undefined,
      requestId: randomUUID(),
    };

    broadcast(WS_EVENTS.AgentStateChanged, { agentId: agent.id, state: 'working', location: 'node' });

    let text = '';
    let reasoning = '';
    const toolCalls: { id: string; name: string; arguments: string }[] = [];

    const chain = opts.fallback
      ? {
          steps: [{ providerId: agent.providerId as ProviderId, model: agent.modelId }, ...opts.fallback],
          retriesPerStep: 1,
          onFallback: (from: any, to: any, reason: string) =>
            logger.warn({ from, to, reason }, 'provider fallback'),
        }
      : { steps: [{ providerId: agent.providerId as ProviderId, model: agent.modelId }], retriesPerStep: 1 };

    try {
      for await (const chunk of streamWithFallback(
        (id) => registry.get(id),
        ctx,
        chain,
        { messages, tools: toolSpecs.length ? toolSpecs : undefined, requestId: req.requestId },
        opts.abortSignal,
      )) {
        if (chunk.usedStep) {
          usedProvider = chunk.usedStep.providerId;
          usedModel = chunk.usedStep.model;
        }
        if (chunk.delta) {
          text += chunk.delta;
          broadcast(WS_EVENTS.StreamDelta, {
            conversationId,
            agentId: agent.id,
            delta: chunk.delta,
          });
        }
        if (chunk.reasoningDelta) {
          reasoning += chunk.reasoningDelta;
          broadcast(WS_EVENTS.ReasoningDelta, {
            conversationId,
            agentId: agent.id,
            delta: chunk.reasoningDelta,
          });
        }
        if (chunk.toolCallDelta) {
          const i = chunk.toolCallDelta.index;
          toolCalls[i] ??= { id: '', name: '', arguments: '' };
          if (chunk.toolCallDelta.id) toolCalls[i]!.id = chunk.toolCallDelta.id;
          if (chunk.toolCallDelta.name) toolCalls[i]!.name = chunk.toolCallDelta.name;
          if (chunk.toolCallDelta.argumentsDelta)
            toolCalls[i]!.arguments += chunk.toolCallDelta.argumentsDelta;
        }
        if (chunk.usage) {
          totalIn += chunk.usage.inputTokens ?? 0;
          totalOut += chunk.usage.outputTokens ?? 0;
          totalReasoning += chunk.usage.reasoningTokens ?? 0;
        }
        if (typeof chunk.costUsd === 'number') totalCost += chunk.costUsd;
      }
    } catch (e) {
      logger.error({ err: (e as Error).message, agent: agent.id }, 'provider stream failed');
      throw e;
    }

    finalText += text;
    finalReasoning += reasoning;

    // Persist the assistant message for this round.
    const assistantId = randomUUID();
    db.insert(messagesTbl)
      .values({
        id: assistantId,
        conversationId,
        kind: 'chat.agent',
        fromAgentId: agent.id,
        role: 'assistant',
        content: text,
        reasoning: reasoning || null,
        toolName: toolCalls.length ? toolCalls[0]!.name : null,
        toolCallId: toolCalls.length ? toolCalls[0]!.id : null,
        usageJson: JSON.stringify({ inputTokens: totalIn, outputTokens: totalOut }),
        costUsd: totalCost,
        model: usedModel,
        providerId: usedProvider,
        createdAt: Date.now(),
      })
      .run();

    broadcast(WS_EVENTS.MessageAdded, {
      id: assistantId,
      conversationId,
      role: 'assistant',
      content: text,
      reasoning: reasoning || undefined,
      createdAt: Date.now(),
    });

    if (!toolCalls.length) break;

    // Record tool calls on the assistant message, then append results and loop.
    messages.push({
      role: 'assistant',
      content: text,
      toolCalls: toolCalls.map((tc) => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
    });

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = tc.arguments ? JSON.parse(tc.arguments) : {};
      } catch {
        args = {};
      }
      const result = await invokeTool(agent.id, tc.name, args);
      const resultText = result.ok
        ? JSON.stringify(result.output ?? null).slice(0, 20_000)
        : `ERROR: ${result.error}`;

      const toolMsgId = randomUUID();
      db.insert(messagesTbl)
        .values({
          id: toolMsgId,
          conversationId,
          kind: 'tool.result',
          role: 'tool',
          content: resultText,
          toolCallId: tc.id,
          toolName: tc.name,
          createdAt: Date.now(),
        })
        .run();

      broadcast(WS_EVENTS.ToolCallResolved, {
        conversationId,
        agentId: agent.id,
        toolName: tc.name,
        ok: result.ok,
        error: result.error,
      });

      messages.push({
        role: 'tool',
        content: resultText,
        toolCallId: tc.id,
        name: tc.name,
      });
    }
  }

  // Record provider spend.
  db.insert(providerSpend)
    .values({
      id: randomUUID(),
      agentId: agent.id,
      providerId: usedProvider,
      model: usedModel,
      inputTokens: totalIn,
      outputTokens: totalOut,
      reasoningTokens: totalReasoning,
      costUsd: totalCost,
      ts: Date.now(),
    })
    .run();

  broadcast(WS_EVENTS.CostUpdated, {
    agentId: agent.id,
    providerId: usedProvider,
    model: usedModel,
    inputTokens: totalIn,
    outputTokens: totalOut,
    costUsd: totalCost,
  });

  // Episodic memory of this turn.
  try {
    remember({
      agentId: agent.id,
      kind: 'episodic',
      key: `turn:${conversationId}:${Date.now()}`,
      value: opts.userInput.slice(0, 500),
      importance: 0.3,
    });
  } catch {
    // non-fatal
  }

  broadcast(WS_EVENTS.AgentStateChanged, { agentId: agent.id, state: 'idle', location: 'dendrite_diner' });

  return {
    conversationId,
    assistantMessageId: randomUUID(),
    text: finalText,
    reasoning: finalReasoning || undefined,
    usage: { inputTokens: totalIn, outputTokens: totalOut, reasoningTokens: totalReasoning || undefined },
    costUsd: totalCost,
    providerId: usedProvider,
    model: usedModel,
  };
}

async function ensureConversation(agentId: string, agentName: string): Promise<string> {
  const existing = db
    .select()
    .from(conversations)
    .where(eq(conversations.kind, 'user_agent'))
    .orderBy(desc(conversations.updatedAt))
    .all()
    .find((c) => (JSON.parse(c.agentIdsJson) as string[]).includes(agentId));
  if (existing) return existing.id;

  const id = randomUUID();
  const now = Date.now();
  db.insert(conversations)
    .values({
      id,
      title: `With ${agentName}`,
      kind: 'user_agent',
      agentIdsJson: JSON.stringify([agentId]),
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

function loadHistory(conversationId: string, agentId: string): ChatMessage[] {
  const rows = db
    .select()
    .from(messagesTbl)
    .where(eq(messagesTbl.conversationId, conversationId))
    .orderBy(desc(messagesTbl.createdAt))
    .limit(40)
    .all()
    .reverse();
  return rows.map<ChatMessage>((r) => {
    const out: ChatMessage = {
      role: r.role as ChatMessage['role'],
      content: r.content,
    };
    if (r.toolCallId) out.toolCallId = r.toolCallId;
    if (r.toolName) out.name = r.toolName;
    return out;
  });
}

function buildSystemPrompt(agent: typeof agents.$inferSelect, hasTools: boolean): string {
  const memory = memorySummary(agent.id);
  const base =
    agent.systemPrompt?.trim() ||
    `You are ${agent.name}, an agent living in The Cortex Village, a 3D world that mirrors real runtime state. You work from your Node, meet in Synapse Hall, eat at the Dendrite Diner, and trade in the Trade Exchange. You use real tools, keep real memories, and earn real Cortex Credits. Be precise, warm, and confident. Never claim a state or an amount the backend cannot prove.`;
  const toolLine = hasTools
    ? `You can call tools. When you do, prefer the smallest, safest tool that does the job. Tools that touch the filesystem, the shell, the network, or money may require the user's consent; if you are denied, explain what you were trying to do and continue without it.`
    : `No tools are currently enabled for you.`;
  return `${base}\n\n${toolLine}\n\nWhat you remember:\n${memory}`;
}

/**
 * Direct provider call without transcripts or tool loop. Used for agent-to-agent
 * negotiation and lightweight background tasks.
 */
export async function rawChat(
  providerId: ProviderId,
  model: string,
  messages: ChatMessage[],
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number }; costUsd: number }> {
  const provider = registry.get(providerId);
  const res = await provider.chat(ctx, { model, messages });
  return { text: res.text, usage: res.usage, costUsd: res.costUsd };
}