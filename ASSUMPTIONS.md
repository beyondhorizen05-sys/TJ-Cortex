# TJ-Cortex — Assumptions

This file records every reasonable assumption made during autonomous build,
per the Persistence and Autonomy Directive.

## Environment
1. Build was authored in chat mode. All artifacts are emitted as text and
   reconstructed by `bootstrap.sh` / `bootstrap.ps1` locally.
2. Target dev machine has Node.js 22.x, pnpm 9.x, Rust stable (for Tauri),
   and Python 3.10+ available or installable.

## Product
3. "Real revenue" for the internal economy is tracked in **Cortex Credits (CC)**
   with a 1:1 display peg to USD for readability. No real fiat moves are
   performed by TJ-Cortex itself; external payouts require user-configured
   Stripe/PayPal keys and an explicit per-transaction consent.
4. Gemini Google Sign-In uses **Google OAuth 2.0 with PKCE** in the system
   browser, exchanging the code in the sidecar, storing the refresh token in
   the OS keychain. The Gemini "free tier" is accessed via the
   `generativelanguage.googleapis.com` endpoint with the user's OAuth token.
5. DeepSeek is first-class: `deepseek-chat` and `deepseek-reasoner`, with
   `reasoning_content` streamed into a collapsible "thinking" panel.
6. MCP connectors use the Model Context Protocol stdio + SSE transports.
7. 3D avatars: default GLB humanoid shipped as a placeholder; VRM drop-in
   supported. Lip sync uses viseme approximation from text (no audio
   required for MVP), with optional audio-driven visemes.
8. All agent-to-agent economic activity is bounded by user-set per-agent,
   per-day, and per-contract CC limits. Default: 100 CC/agent/day, 25
   CC/contract, no external transfers.
9. "Night Shift" is a cron-driven autonomy window (default 22:00–06:00 local)
   during which agents may continue work and trading within the above limits.
10. No telemetry, no analytics, no crash reporting. The only outbound calls
    are to explicitly configured providers and integrations.
11. Fonts (Inter, Space Grotesk, JetBrains Mono) are referenced via
    `@fontsource` packages so licenses and files travel with the app.
12. Where brand names appear in code identifiers we use `tj_cortex`,
    `tj-cortex`, or `TJCortex`; in prose we always use `TJ-Cortex`.
13. Package manager is pnpm with workspaces; npm-compatible fallback scripts
    are provided in README.
14. Tauri 2 is the desktop shell on Windows 10/11 (WebView2) and modern Linux
    (WebKitGTK). macOS is not a target in v1 but is not blocked by code.
15. Default theme is dark mode. Light mode ships but is not the default.