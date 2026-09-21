import type { ToolDescriptor, ToolResult, ToolInvocation } from '@tj-cortex/shared';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client.js';
import { toolInvocations } from '../db/schema.js';
import { ask } from '../permissions.js';
import { logger } from '../logger.js';

export interface ToolHandler {
  descriptor: ToolDescriptor;
  /** Called to actually execute. Return value is stored as `output`. */
  run(inv: ToolInvocation): Promise<unknown>;
}

const handlers = new Map<string, ToolHandler>();

export function registerTool(handler: ToolHandler) {
  handlers.set(handler.descriptor.name, handler);
  logger.debug({ tool: handler.descriptor.name, risk: handler.descriptor.risk }, 'tool registered');
}

export function listTools(): ToolDescriptor[] {
  return [...handlers.values()].map((h) => h.descriptor);
}

export function getTool(name: string): ToolHandler | undefined {
  return handlers.get(name);
}

/**
 * Execute a tool with the full permission + audit pipeline.
 *
 * Steps:
 *   1. Look up the tool.
 *   2. If it requires consent (or risk is destructive/spend), ask.
 *   3. Persist an invocation row.
 *   4. Run.
 *   5. Persist result; return.
 */
export async function invokeTool(
  agentId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const handler = handlers.get(toolName);
  const invocationId = randomUUID();
  const requestedAt = Date.now();

  if (!handler) {
    const res: ToolResult = {
      invocationId,
      ok: false,
      error: `Unknown tool: ${toolName}`,
      durationMs: 0,
      resolvedAt: Date.now(),
    };
    return res;
  }

  // Permission gate.
  const d = handler.descriptor;
  const needsConsent =
    d.requiresConsent ||
    d.risk === 'destructive' ||
    d.risk === 'spend' ||
    d.risk === 'external';

  if (needsConsent) {
    const allowed = await ask({
      agentId,
      kind: riskToPermissionKind(d.risk, d.category),
      scope: `${d.name}:${JSON.stringify(args).slice(0, 200)}`,
      reason: `Agent wants to use ${d.name}.`,
      risk: d.risk === 'read' ? 'low' : d.risk === 'write' ? 'medium' : 'high',
    });
    if (!allowed) {
      const denied: ToolResult = {
        invocationId,
        ok: false,
        error: 'Permission denied by user.',
        durationMs: 0,
        resolvedAt: Date.now(),
      };
      persistInvocation(agentId, toolName, args, denied);
      return denied;
    }
  }

  const start = Date.now();
  db.insert(toolInvocations)
    .values({
      id: invocationId,
      agentId,
      toolName,
      argsJson: JSON.stringify(args),
      requestedAt,
    })
    .run();

  try {
    const output = await handler.run({
      id: invocationId,
      agentId,
      toolName,
      args,
      requestedAt,
    });
    const res: ToolResult = {
      invocationId,
      ok: true,
      output,
      durationMs: Date.now() - start,
      resolvedAt: Date.now(),
    };
    persistInvocationResult(invocationId, res);
    return res;
  } catch (e) {
    const res: ToolResult = {
      invocationId,
      ok: false,
      error: (e as Error).message,
      durationMs: Date.now() - start,
      resolvedAt: Date.now(),
    };
    persistInvocationResult(invocationId, res);
    return res;
  }
}

function persistInvocation(
  agentId: string,
  toolName: string,
  args: Record<string, unknown>,
  res: ToolResult,
) {
  db.insert(toolInvocations)
    .values({
      id: res.invocationId,
      agentId,
      toolName,
      argsJson: JSON.stringify(args),
      resultJson: JSON.stringify(res),
      ok: res.ok,
      error: res.error,
      durationMs: res.durationMs,
      requestedAt: res.resolvedAt,
      resolvedAt: res.resolvedAt,
    })
    .run();
}

function persistInvocationResult(id: string, res: ToolResult) {
  db.update(toolInvocations)
    .set({
      resultJson: JSON.stringify(res.output ?? null),
      ok: res.ok,
      error: res.error,
      durationMs: res.durationMs,
      resolvedAt: res.resolvedAt,
    })
    .where(eqId(id))
    .run();
}

// tiny local helper to avoid a second import line
import { eq } from 'drizzle-orm';
function eqId(id: string) {
  return eq(toolInvocations.id, id);
}

function riskToPermissionKind(risk: ToolDescriptor['risk'], category: ToolDescriptor['category']) {
  switch (risk) {
    case 'read': return category === 'fs' ? 'fs.read' : category === 'http' ? 'http.outbound' : category === 'voice' ? 'voice.capture' : 'mcp.call';
    case 'write': return category === 'fs' ? 'fs.write' : category === 'outbox' ? 'outbox.write' : 'mcp.call';
    case 'destructive': return 'shell.exec';
    case 'spend': return 'economy.spend';
    case 'external': return 'http.outbound';
  }
}