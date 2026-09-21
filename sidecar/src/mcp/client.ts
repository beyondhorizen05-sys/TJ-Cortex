import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { McpServerConfig } from '@tj-cortex/shared';
import { registerTool } from './../tools/registry.js';
import { logger } from '../logger.js';

/**
 * MCP client manager. Each configured server is a persistent connection.
 * Tools exposed by the server are registered into the TJ-Cortex tool registry
 * under a namespaced name: `mcp.<serverId>.<toolName>`.
 */

interface Connection {
  config: McpServerConfig;
  client: Client;
  toolNames: string[];
}

const connections = new Map<string, Connection>();

export async function connectMcp(config: McpServerConfig): Promise<void> {
  if (connections.has(config.id)) return;
  const client = new Client(
    { name: 'tj-cortex', version: '0.1.0' },
    { capabilities: {} },
  );

  const transport =
    config.transport === 'stdio'
      ? new StdioClientTransport({
          command: config.command!,
          args: config.args,
          env: Object.fromEntries(Object.entries({ ...process.env, ...config.env }).filter(([, value]) => value !== undefined)) as Record<string, string>,
        })
      : new SSEClientTransport(new URL(config.url!));

  await client.connect(transport);

  const listed = await client.listTools();
  const toolNames: string[] = [];
  for (const t of listed.tools) {
    const name = `mcp.${config.id}.${t.name}`;
    toolNames.push(name);
    registerTool({
      descriptor: {
        name,
        category: 'mcp',
        description: `[${config.name}] ${t.description ?? t.name}`,
        risk: config.trustedTools.includes(t.name) ? 'read' : 'external',
        parameters: (t.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
        requiresConsent: !config.trustedTools.includes(t.name),
        scoped: true,
        enabled: true,
      },
      async run(inv) {
        const res = await client.callTool({
          name: t.name,
          arguments: inv.args,
        });
        return res.content;
      },
    });
  }

  connections.set(config.id, { config, client, toolNames });
  logger.info({ server: config.id, toolCount: toolNames.length }, 'mcp connected');
}

export async function disconnectMcp(id: string): Promise<void> {
  const c = connections.get(id);
  if (!c) return;
  await c.client.close().catch(() => {});
  connections.delete(id);
  logger.info({ server: id }, 'mcp disconnected');
}

export function listMcpConnections() {
  return [...connections.values()].map((c) => ({
    id: c.config.id,
    name: c.config.name,
    transport: c.config.transport,
    toolNames: c.toolNames,
  }));
}