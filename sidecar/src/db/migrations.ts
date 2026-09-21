import type { Database } from 'better-sqlite3';

/**
 * Idempotent schema bootstrap. Each CREATE uses IF NOT EXISTS so re-running
 * the sidecar is safe. For real schema evolution we also track a `_migrations`
 * table so future turns can add numbered migrations without dropping data.
 */
export function runMigrations(sqlite: Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      appliedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'generalist',
      system_prompt TEXT NOT NULL DEFAULT '',
      avatar_json TEXT NOT NULL DEFAULT '{}',
      boundaries_json TEXT NOT NULL DEFAULT '{}',
      provider_id TEXT NOT NULL DEFAULT 'gemini',
      model_id TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
      state TEXT NOT NULL DEFAULT 'idle',
      location TEXT NOT NULL DEFAULT 'node',
      pos_x REAL NOT NULL DEFAULT 0,
      pos_z REAL NOT NULL DEFAULT 0,
      wallet_id TEXT NOT NULL,
      reputation_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS agents_name_idx ON agents(name);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'user_agent',
      agent_ids_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      from_agent_id TEXT,
      to_agent_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      reasoning TEXT,
      tool_call_id TEXT,
      tool_name TEXT,
      usage_json TEXT,
      cost_usd REAL NOT NULL DEFAULT 0,
      model TEXT,
      provider_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      importance REAL NOT NULL DEFAULT 0.5,
      source_message_id TEXT,
      created_at INTEGER NOT NULL,
      last_accessed_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS memories_agent_kind_idx ON memories(agent_id, kind);
    CREATE UNIQUE INDEX IF NOT EXISTS memories_agent_key_idx ON memories(agent_id, key);

    CREATE TABLE IF NOT EXISTS permission_policies (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      scope TEXT NOT NULL,
      decision TEXT NOT NULL,
      granted_at INTEGER NOT NULL,
      expires_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS perm_kind_scope_idx ON permission_policies(kind, scope);

    CREATE TABLE IF NOT EXISTS permission_requests (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      scope TEXT NOT NULL,
      reason TEXT NOT NULL,
      risk TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      decision TEXT,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tool_invocations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      args_json TEXT NOT NULL,
      result_json TEXT,
      ok INTEGER,
      error TEXT,
      duration_ms INTEGER,
      requested_at INTEGER NOT NULL,
      resolved_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS outbox_items (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      path TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      ref_type TEXT,
      ref_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      label TEXT NOT NULL,
      balance_cc REAL NOT NULL DEFAULT 0,
      escrow_cc REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount_cc REAL NOT NULL,
      from_wallet_id TEXT,
      to_wallet_id TEXT,
      agent_id TEXT,
      ref_id TEXT,
      memo TEXT,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL,
      signature TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ledger_ts_idx ON ledger_entries(ts);

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      brief TEXT NOT NULL,
      client_agent_id TEXT NOT NULL,
      worker_agent_id TEXT,
      amount_cc REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      deliverables_json TEXT NOT NULL DEFAULT '[]',
      escrow_wallet_id TEXT,
      negotiation_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      settled_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS bounties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      brief TEXT NOT NULL,
      reward_cc REAL NOT NULL,
      posted_by_agent_id TEXT NOT NULL,
      claimed_by_agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      escrow_wallet_id TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      paid_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      emblem_seed TEXT NOT NULL,
      member_agent_ids_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reputations (
      agent_id TEXT PRIMARY KEY,
      score REAL NOT NULL DEFAULT 0,
      contracts_completed INTEGER NOT NULL DEFAULT 0,
      contracts_disputed INTEGER NOT NULL DEFAULT 0,
      total_earned_cc REAL NOT NULL DEFAULT 0,
      total_spent_cc REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_briefs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      selected_option_id TEXT,
      answer_note TEXT,
      created_at INTEGER NOT NULL,
      answered_at INTEGER,
      expires_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS task_briefs_agent_status_idx ON task_briefs(agent_id, status);

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      steps_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL,
      prompt_template TEXT,
      tool_name TEXT,
      composed_skills_json TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      transport TEXT NOT NULL,
      command TEXT,
      args_json TEXT NOT NULL DEFAULT '[]',
      env_json TEXT NOT NULL DEFAULT '{}',
      url TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      trusted_tools_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      configured INTEGER NOT NULL DEFAULT 0,
      account_label TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      cron TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_spend (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      provider_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS spend_provider_idx ON provider_spend(provider_id, ts);
    CREATE INDEX IF NOT EXISTS spend_agent_idx ON provider_spend(agent_id, ts);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const mark = sqlite.prepare(
    'INSERT OR IGNORE INTO _migrations (id, appliedAt) VALUES (?, ?)',
  );
  mark.run('0001_baseline', Date.now());
}