import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { logger } from './logger.js';
import { registerClient } from './ws.js';
import { registerRoutes } from './routes/index.js';
import { startNightShift } from './nightshift.js';
import { connectMcp } from './mcp/client.js';
import { db } from './db/client.js';
import { mcpServers } from './db/schema.js';
import './tools/voice.js';

export async function createServer() {
  const app = Fastify({
    logger: false,
    bodyLimit: 20 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: [/^http:\/\/localhost:\d+$/, /^tauri:\/\//, /^https?:\/\/tauri\.localhost(?::\d+)?$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  });

  await app.register(websocket);

  app.get('/ws', { websocket: true }, (connection: any) => {
    registerClient(connection.socket ?? connection);
  });

  await registerRoutes(app);

  app.get('/health', async () => ({ ok: true, version: '0.1.0', clients: 0 }));

  return app;
}

export async function start() {
  const app = await createServer();

  // Reconnect any enabled MCP servers on boot.
  for (const s of db.select().from(mcpServers).all()) {
    if (!s.enabled) continue;
    try {
      await connectMcp({
        id: s.id,
        name: s.name,
        transport: s.transport as 'stdio' | 'sse',
        command: s.command ?? undefined,
        args: JSON.parse(s.argsJson),
        env: JSON.parse(s.envJson),
        url: s.url ?? undefined,
        enabled: s.enabled,
        trustedTools: JSON.parse(s.trustedToolsJson),
      });
    } catch (e) {
      logger.warn({ server: s.id, err: (e as Error).message }, 'mcp reconnect failed');
    }
  }

  startNightShift();

  await app.listen({ host: config.host, port: config.port });
  logger.info({ host: config.host, port: config.port, db: config.dbPath }, 'TJ-Cortex sidecar listening');

  return app;
}