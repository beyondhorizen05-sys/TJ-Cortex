import { SIDECAR_DEFAULT_HOST, SIDECAR_DEFAULT_PORT } from '@tj-cortex/shared';
import type {
  Agent, Conversation, TranscriptMessage, ProviderStatus, ModelInfo,
  PermissionRequest, ToolDescriptor, Recipe, Skill, McpServerConfig,
  LedgerEntry, Wallet, Contract, Bounty, Guild, Reputation, OutboxItem,
} from '@tj-cortex/shared';

const BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? '/api'
  : 'http://' + SIDECAR_DEFAULT_HOST + ':' + SIDECAR_DEFAULT_PORT;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(res.status + ' ' + t.slice(0, 300));
  }
  return res.json() as Promise<T>;
}

export const api = {
  listAgents: () => http<Agent[]>('/agents'),
  getAgent: (id: string) => http<Agent>('/agents/' + id),
  createAgent: (input: Partial<Agent> & { name: string }) => http<Agent>('/agents', { method: 'POST', body: JSON.stringify(input) }),
  updateAgent: (id: string, patch: Partial<Agent>) => http<Agent>('/agents/' + id, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteAgent: (id: string) => http<{ ok: true }>('/agents/' + id, { method: 'DELETE' }),
  listConversations: () => http<Conversation[]>('/conversations'),
  getConversation: (id: string) => http<Conversation & { messages: TranscriptMessage[] }>('/conversations/' + id),
  runTurn: (body: { agentId: string; conversationId?: string; input: string }) => http<{ conversationId: string; text: string; reasoning?: string }>('/run', { method: 'POST', body: JSON.stringify(body) }),
  listProviders: () => http<ProviderStatus[]>('/providers'),
  listModels: (id: string) => http<ModelInfo[]>('/providers/' + id + '/models'),
  setProviderKey: (id: string, apiKey: string) => http<{ ok: true }>('/providers/' + id + '/key', { method: 'POST', body: JSON.stringify({ apiKey }) }),
  deleteProviderKey: (id: string) => http<{ ok: true }>('/providers/' + id + '/key', { method: 'DELETE' }),
  setProviderBaseUrl: (id: string, baseUrl: string) => http<{ ok: true }>('/providers/' + id + '/base-url', { method: 'POST', body: JSON.stringify({ baseUrl }) }),
  providerHealth: (id: string) => http<{ ok: boolean; error?: string; accountEmail?: string }>('/providers/' + id + '/health', { method: 'POST' }),
  googleStatus: () => http<{ configured: boolean; email?: string }>('/auth/google/status'),
  googleSignIn: () => http<{ ok: true; email?: string }>('/auth/google/signin', { method: 'POST' }),
  googleSignOut: () => http<{ ok: true }>('/auth/google/signout', { method: 'POST' }),
  googleSetClient: (clientId: string, clientSecret?: string) => http<{ ok: true }>('/auth/google/client', { method: 'POST', body: JSON.stringify({ clientId, clientSecret }) }),
  listPolicies: () => http<any[]>('/permissions/policies'),
  resolvePermission: (id: string, decision: 'allow_once' | 'allow_always' | 'deny') => http<{ ok: true }>('/permissions/resolve', { method: 'POST', body: JSON.stringify({ id, decision }) }),
  listTools: () => http<ToolDescriptor[]>('/tools'),
  invokeTool: (agentId: string, toolName: string, args: Record<string, unknown>) => http<any>('/tools/invoke', { method: 'POST', body: JSON.stringify({ agentId, toolName, args }) }),
  listRecipes: () => http<Recipe[]>('/recipes'),
  createRecipe: (input: Partial<Recipe> & { name: string }) => http<Recipe>('/recipes', { method: 'POST', body: JSON.stringify(input) }),
  deleteRecipe: (id: string) => http<{ ok: true }>('/recipes/' + id, { method: 'DELETE' }),
  listSkills: () => http<Skill[]>('/skills'),
  createSkill: (input: Partial<Skill> & { name: string; kind: Skill['kind'] }) => http<Skill>('/skills', { method: 'POST', body: JSON.stringify(input) }),
  deleteSkill: (id: string) => http<{ ok: true }>('/skills/' + id, { method: 'DELETE' }),
  listMcp: () => http<McpServerConfig[]>('/mcp'),
  listMcpLive: () => http<any[]>('/mcp/live'),
  createMcp: (input: Partial<McpServerConfig> & { name: string; transport: 'stdio' | 'sse' }) => http<any>('/mcp', { method: 'POST', body: JSON.stringify(input) }),
  deleteMcp: (id: string) => http<{ ok: true }>('/mcp/' + id, { method: 'DELETE' }),
  listOutbox: () => http<OutboxItem[]>('/outbox'),
  deleteOutbox: (id: string) => http<{ ok: true }>('/outbox/' + id, { method: 'DELETE' }),
  outboxRawUrl: (id: string) => BASE + '/outbox/' + id + '/raw',
  listWallets: () => http<Wallet[]>('/economy/wallets'),
  listLedger: (limit = 200) => http<LedgerEntry[]>('/economy/ledger?limit=' + limit),
  listContracts: () => http<Contract[]>('/economy/contracts'),
  listBounties: () => http<Bounty[]>('/economy/bounties'),
  listGuilds: () => http<Guild[]>('/economy/guilds'),
  getReputation: (agentId: string) => http<Reputation>('/economy/reputation/' + agentId),
  getSettings: () => http<Record<string, unknown>>('/settings'),
  setSetting: (key: string, value: unknown) => http<{ ok: true }>('/settings/' + key, { method: 'PUT', body: JSON.stringify(value) }),
};