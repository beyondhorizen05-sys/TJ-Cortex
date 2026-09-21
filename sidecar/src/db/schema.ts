import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

/* ---------- Agents ---------- */
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull().default('generalist'),
  systemPrompt: text('system_prompt').notNull().default(''),
  avatarJson: text('avatar_json').notNull().default('{}'),
  boundariesJson: text('boundaries_json').notNull().default('{}'),
  providerId: text('provider_id').notNull().default('gemini'),
  modelId: text('model_id').notNull().default('gemini-2.0-flash'),
  state: text('state').notNull().default('idle'),
  location: text('location').notNull().default('node'),
  posX: real('pos_x').notNull().default(0),
  posZ: real('pos_z').notNull().default(0),
  walletId: text('wallet_id').notNull(),
  reputationId: text('reputation_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => ({
  nameIdx: index('agents_name_idx').on(t.name),
}));

/* ---------- Conversations & Transcripts ---------- */
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  kind: text('kind').notNull().default('user_agent'),
  agentIdsJson: text('agent_ids_json').notNull().default('[]'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  kind: text('kind').notNull(),
  fromAgentId: text('from_agent_id'),
  toAgentId: text('to_agent_id'),
  role: text('role').notNull(),
  content: text('content').notNull().default(''),
  reasoning: text('reasoning'),
  toolCallId: text('tool_call_id'),
  toolName: text('tool_name'),
  usageJson: text('usage_json'),
  costUsd: real('cost_usd').notNull().default(0),
  model: text('model'),
  providerId: text('provider_id'),
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  convIdx: index('messages_conv_idx').on(t.conversationId, t.createdAt),
}));

/* ---------- Memory (Cortex) ---------- */
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  kind: text('kind').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  importance: real('importance').notNull().default(0.5),
  sourceMessageId: text('source_message_id'),
  createdAt: integer('created_at').notNull(),
  lastAccessedAt: integer('last_accessed_at').notNull(),
}, (t) => ({
  agentKindIdx: index('memories_agent_kind_idx').on(t.agentId, t.kind),
  agentKeyIdx: uniqueIndex('memories_agent_key_idx').on(t.agentId, t.key),
}));

/* ---------- Permissions ---------- */
export const permissionPolicies = sqliteTable('permission_policies', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  scope: text('scope').notNull(),
  decision: text('decision').notNull(),
  grantedAt: integer('granted_at').notNull(),
  expiresAt: integer('expires_at'),
}, (t) => ({
  kindScopeIdx: uniqueIndex('perm_kind_scope_idx').on(t.kind, t.scope),
}));

export const permissionRequests = sqliteTable('permission_requests', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  kind: text('kind').notNull(),
  scope: text('scope').notNull(),
  reason: text('reason').notNull(),
  risk: text('risk').notNull(),
  status: text('status').notNull().default('pending'),
  decision: text('decision'),
  createdAt: integer('created_at').notNull(),
  resolvedAt: integer('resolved_at'),
});

/* ---------- Tools ---------- */
export const toolInvocations = sqliteTable('tool_invocations', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  toolName: text('tool_name').notNull(),
  argsJson: text('args_json').notNull(),
  resultJson: text('result_json'),
  ok: integer('ok', { mode: 'boolean' }),
  error: text('error'),
  durationMs: integer('duration_ms'),
  requestedAt: integer('requested_at').notNull(),
  resolvedAt: integer('resolved_at'),
});

/* ---------- OUTBOX ---------- */
export const outboxItems = sqliteTable('outbox_items', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  title: text('title').notNull(),
  path: text('path').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes').notNull().default(0),
  refType: text('ref_type'),
  refId: text('ref_id'),
  createdAt: integer('created_at').notNull(),
});

/* ---------- Economy ---------- */
export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  agentId: text('agent_id'),
  label: text('label').notNull(),
  balanceCC: real('balance_cc').notNull().default(0),
  escrowCC: real('escrow_cc').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const ledgerEntries = sqliteTable('ledger_entries', {
  id: text('id').primaryKey(),
  ts: integer('ts').notNull(),
  kind: text('kind').notNull(),
  amountCC: real('amount_cc').notNull(),
  fromWalletId: text('from_wallet_id'),
  toWalletId: text('to_wallet_id'),
  agentId: text('agent_id'),
  refId: text('ref_id'),
  memo: text('memo'),
  prevHash: text('prev_hash').notNull(),
  hash: text('hash').notNull(),
  signature: text('signature').notNull(),
}, (t) => ({
  tsIdx: index('ledger_ts_idx').on(t.ts),
}));

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  brief: text('brief').notNull(),
  clientAgentId: text('client_agent_id').notNull(),
  workerAgentId: text('worker_agent_id'),
  amountCC: real('amount_cc').notNull(),
  status: text('status').notNull().default('draft'),
  deliverablesJson: text('deliverables_json').notNull().default('[]'),
  escrowWalletId: text('escrow_wallet_id'),
  negotiationJson: text('negotiation_json').notNull().default('[]'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  settledAt: integer('settled_at'),
});

export const bounties = sqliteTable('bounties', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  brief: text('brief').notNull(),
  rewardCC: real('reward_cc').notNull(),
  postedByAgentId: text('posted_by_agent_id').notNull(),
  claimedByAgentId: text('claimed_by_agent_id'),
  status: text('status').notNull().default('open'),
  escrowWalletId: text('escrow_wallet_id'),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at'),
  paidAt: integer('paid_at'),
});

export const guilds = sqliteTable('guilds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  purpose: text('purpose').notNull(),
  emblemSeed: text('emblem_seed').notNull(),
  memberAgentIdsJson: text('member_agent_ids_json').notNull().default('[]'),
  createdAt: integer('created_at').notNull(),
});

export const reputations = sqliteTable('reputations', {
  agentId: text('agent_id').primaryKey(),
  score: real('score').notNull().default(0),
  contractsCompleted: integer('contracts_completed').notNull().default(0),
  contractsDisputed: integer('contracts_disputed').notNull().default(0),
  totalEarnedCC: real('total_earned_cc').notNull().default(0),
  totalSpentCC: real('total_spent_cc').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

/* ---------- Recipes & Skills ---------- */
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  tagsJson: text('tags_json').notNull().default('[]'),
  stepsJson: text('steps_json').notNull().default('[]'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  kind: text('kind').notNull(),
  promptTemplate: text('prompt_template'),
  toolName: text('tool_name'),
  composedSkillsJson: text('composed_skills_json').notNull().default('[]'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

/* ---------- MCP ---------- */
export const mcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  transport: text('transport').notNull(),
  command: text('command'),
  argsJson: text('args_json').notNull().default('[]'),
  envJson: text('env_json').notNull().default('{}'),
  url: text('url'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  trustedToolsJson: text('trusted_tools_json').notNull().default('[]'),
});

/* ---------- Integrations ---------- */
export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  configured: integer('configured', { mode: 'boolean' }).notNull().default(false),
  accountLabel: text('account_label'),
  createdAt: integer('created_at'),
});

/* ---------- Scheduler / Autonomy ---------- */
export const scheduledJobs = sqliteTable('scheduled_jobs', {
  id: text('id').primaryKey(),
  agentId: text('agent_id'),
  cron: text('cron').notNull(),
  kind: text('kind').notNull(),
  payloadJson: text('payload_json').notNull().default('{}'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: integer('last_run_at'),
  createdAt: integer('created_at').notNull(),
});

/* ---------- Cost tracking ---------- */
export const providerSpend = sqliteTable('provider_spend', {
  id: text('id').primaryKey(),
  agentId: text('agent_id'),
  providerId: text('provider_id').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  reasoningTokens: integer('reasoning_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  ts: integer('ts').notNull(),
}, (t) => ({
  providerIdx: index('spend_provider_idx').on(t.providerId, t.ts),
  agentIdx: index('spend_agent_idx').on(t.agentId, t.ts),
}));

/* ---------- Settings (KV) ---------- */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const schema = {
  agents,
  conversations,
  messages,
  memories,
  permissionPolicies,
  permissionRequests,
  toolInvocations,
  outboxItems,
  wallets,
  ledgerEntries,
  contracts,
  bounties,
  guilds,
  reputations,
  recipes,
  skills,
  mcpServers,
  integrations,
  scheduledJobs,
  providerSpend,
  settings,
};