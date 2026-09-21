import type { FastifyInstance } from 'fastify';
import { registerAgentRoutes } from './agents.js';
import { registerProviderRoutes } from './providers.js';
import { registerConversationRoutes } from './conversations.js';
import { registerPermissionRoutes } from './permissions.js';
import { registerToolRoutes } from './tools.js';
import { registerRecipeRoutes } from './recipes.js';
import { registerSkillRoutes } from './skills.js';
import { registerMcpRoutes } from './mcp.js';
import { registerOutboxRoutes } from './outbox.js';
import { registerGoogleAuthRoutes } from './google-auth.js';
import { registerSettingsRoutes } from './settings.js';
import { registerEconomyRoutes } from './economy.js';
import { registerNegotiationRoutes } from './negotiation.js';
import { registerVoiceRoutes } from './voice.js';
import { registerTaskBriefRoutes } from './task-briefs.js';
import { registerCrewRoutes } from './crew.js';

export async function registerRoutes(app: FastifyInstance) {
  await registerNegotiationRoutes(app);
  await registerVoiceRoutes(app);
  await registerTaskBriefRoutes(app);
  await registerCrewRoutes(app);
  await registerAgentRoutes(app);
  await registerProviderRoutes(app);
  await registerConversationRoutes(app);
  await registerPermissionRoutes(app);
  await registerToolRoutes(app);
  await registerRecipeRoutes(app);
  await registerSkillRoutes(app);
  await registerMcpRoutes(app);
  await registerOutboxRoutes(app);
  await registerGoogleAuthRoutes(app);
  await registerSettingsRoutes(app);
  await registerEconomyRoutes(app);
}