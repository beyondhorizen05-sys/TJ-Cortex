# TJ-Cortex Security

## Reporting a vulnerability

Please open a private security advisory on GitHub. Do not file a public issue.

We will respond within 5 working days. There is no bug bounty program.

## Design principles

1. **Local-first.** The only outbound network calls are to AI providers and
   integrations the user has explicitly configured.
2. **No telemetry.** No analytics, no crash reporting, no hidden calls.
3. **Secrets in the OS keychain.** Provider API keys, Google OAuth tokens, and
   the Cortex Ledger signing secret are stored via `keytar` (Windows Credential
   Vault / macOS Keychain / libsecret on Linux). They never reach the UI, are
   never logged, and are never written to SQLite.
4. **Permissioned tools.** Every destructive, spend, or external tool call is
   gated through the permission engine. Denial is the default and nothing runs
   without explicit user consent.
5. **Signed, hash-chained ledger.** Every economic transaction is written with
   HMAC-SHA-256 and chained to the previous entry. `GET /economy/audit`
   verifies the entire chain and reports the first broken entry.
6. **Boundaries by default.** Each agent has per-day and per-contract CC caps
   and a consent threshold. External transfers are disabled by default.
7. **Least privilege in Tauri.** The desktop shell declares only the
   capabilities it needs (loopback HTTP/WS, spawning the local sidecar, opening
   the system browser for Google Sign-In). There is no broad filesystem or
   shell scope.
8. **No eval, no remote code.** MCP tools are transported over stdio or SSE.
   Recipes and skills are data, not code.

## Threat model

- **Untrusted provider responses.** Model output is treated as text and never
  evaluated. Tool calls are parsed as JSON, validated against schemas, and
  gated by the permission engine.
- **Untrusted MCP servers.** MCP servers are opt-in per connection. Tools they
  expose default to `requiresConsent: true` unless the user marks them trusted.
- **Compromised local process.** The sidecar binds to `127.0.0.1` only.
  Authenticated endpoints do not exist: the assumption is that the local user
  is the operator. On shared machines we recommend OS-level user separation.
- **Compromised provider key.** Rotate the key in the provider's dashboard and
  clear it in **Providers** in the app; the keychain entry is deleted.

## Non-goals (v1)

- Multi-user server deployments.
- Hardware wallet / external signing.
- Formal verification of the ledger chain (it is tamper-evident, not
  Byzantine-fault-tolerant).