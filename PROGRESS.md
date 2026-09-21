# TJ-Cortex — Build Progress

## Turn 1 — DONE   (mode, skeleton, brand system)
## Turn 2 — DONE   (shared/, providers/)
## Turn 3 — DONE   (sidecar/)
## Turn 4 — DONE   (ui/)
## Turn 5 — DONE   (village/)

## Turn 6 — DONE
- [x] economy/ package
  - units.ts        — Cortex Credits (CC), 1:1 USD display peg, 2-dp rounding
  - signer.ts       — canonical JSON, SHA-256 chain hash, HMAC-SHA-256 sig,
                      constant-time verify, chain digest
  - ledger.ts       — append-only, hash-chained, signed; audit() walks the
                      chain and reports the first broken entry
  - wallets.ts      — treasury, agent wallets, escrow wallets, mint, transfer,
                      move/release/refund escrow
  - boundaries.ts   — per-agent, per-day, per-contract, consent thresholds
  - contracts.ts    — full lifecycle: draft → proposed → accepted →
                      in_progress → delivered → settled (+ cancel/dispute),
                      negotiation log, escrow funding + payout + refund
  - bounties.ts     — post / claim / submit / pay, escrow-backed
  - guilds.ts       — create / join / leave, deterministic emblem seed
  - reputation.ts   — 0–100 score, completed/disputed counters, earned/spent
  - engine.ts       — façade with the local signing secret, held by the sidecar
- [x] sidecar/src/economy/store.ts — DrizzleEconomyStore (real DB, no memory)
- [x] sidecar/src/economy/wire.ts — singleton engine, secret in OS keychain,
                                     event → WS broadcast mapping
- [x] sidecar/src/routes/economy.ts — extended with writes: propose, accept
                                     (with consent gate), start, deliver, settle,
                                     cancel, post/claim/submit/pay bounties,
                                     guilds, treasury mint, audit
- [x] sidecar/src/agents/negotiation.ts — real two-agent negotiation over the
                                          provider layer; produces a real
                                          contract, escrow, payout, reputation
- [x] sidecar/src/routes/negotiation.ts — POST /negotiate
- [x] village/src/state/economyStore.ts — live economy data for the world;
                                          binds LedgerEntry, OutboxUpdated,
                                          GuildUpdated
- [x] Village.tsx and VillageHost.tsx patched: Trade Exchange beacon pulses on
      ledger entries; OUTBOX beacon fires on delivery; Guild Hall banners count
      up; Myelin Bank vault ring tracks total CC
- [x] bootstrap-part-6.sh

## Turn 7 — PENDING (next)
- [ ] desktop/ — Tauri 2 shell (Windows 10/11 + modern Linux), capabilities,
      icons derived from brand SVG, autostart of the sidecar as a sidecar
      process, dev + production build scripts
- [ ] .github/workflows/build.yml — matrix for windows-latest + ubuntu-latest
- [ ] README install section, SECURITY.md, CONTRIBUTING.md
- [ ] Final bootstrap scripts (bootstrap.sh / bootstrap.ps1) that run every
      part in sequence and produce tj-cortex.zip
- [ ] .zip verification + tree listing in the closing message