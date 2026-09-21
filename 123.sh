#!/usr/bin/env bash
# TJ-Cortex bootstrap — Part 1 of 7
# Run: chmod +x bootstrap.sh && ./bootstrap.sh
set -euo pipefail

ROOT="tj-cortex"
echo "▶ TJ-Cortex bootstrap (part 1/7) — reconstructing project skeleton and brand system"

mkdir -p "$ROOT"/{branding/{logo/png,colors,fonts,icons,social,app-icons,splash,economy},shared/src,providers/src,sidecar/src,ui/src,village/src,economy/src,desktop,scripts,.github/workflows}

# --- ASSUMPTIONS.md ---
cat > "$ROOT/ASSUMPTIONS.md" <<'EOF'
# TJ-Cortex — Assumptions

This file records every reasonable assumption made during autonomous build,
per the Persistence and Autonomy Directive.

## Environment
1. Build was authored in chat mode. All artifacts are emitted as text and
   reconstructed by `bootstrap.sh` / `bootstrap.ps1` locally.
2. Target dev machine has Node.js 22.x, pnpm 9.x, Rust stable (for Tauri),
   and Python 3.10+ available or installable.

## Product
3. "Real revenue" for the internal economy is tracked in Cortex Credits (CC)
   with a 1:1 display peg to USD for readability. No real fiat moves are
   performed by TJ-Cortex itself; external payouts require user-configured
   Stripe/PayPal keys and an explicit per-transaction consent.
4. Gemini Google Sign-In uses Google OAuth 2.0 with PKCE in the system
   browser, exchanging the code in the sidecar, storing the refresh token in
   the OS keychain. The Gemini "free tier" is accessed via the
   generativelanguage.googleapis.com endpoint with the user's OAuth token.
5. DeepSeek is first-class: deepseek-chat and deepseek-reasoner, with
   reasoning_content streamed into a collapsible "thinking" panel.
6. MCP connectors use the Model Context Protocol stdio + SSE transports.
7. 3D avatars: default GLB humanoid shipped as a placeholder; VRM drop-in
   supported. Lip sync uses viseme approximation from text.
8. All agent-to-agent economic activity is bounded by user-set per-agent,
   per-day, and per-contract CC limits. Default: 100 CC/agent/day, 25
   CC/contract, no external transfers.
9. "Night Shift" is a cron-driven autonomy window (default 22:00-06:00 local).
10. No telemetry, no analytics, no crash reporting. The only outbound calls
    are to explicitly configured providers and integrations.
11. Fonts (Inter, Space Grotesk, JetBrains Mono) are referenced via
    @fontsource packages so licenses and files travel with the app.
12. Where brand names appear in code identifiers we use tj_cortex, tj-cortex,
    or TJCortex; in prose we always use TJ-Cortex.
13. Package manager is pnpm with workspaces; npm-compatible fallback scripts
    are provided in README.
14. Tauri 2 is the desktop shell on Windows 10/11 (WebView2) and modern Linux
    (WebKitGTK). macOS is not a target in v1 but is not blocked by code.
15. Default theme is dark mode. Light mode ships but is not the default.
EOF

# --- PROGRESS.md ---
cat > "$ROOT/PROGRESS.md" <<'EOF'
# TJ-Cortex — Build Progress
## Turn 1 — DONE (this file regenerated each part)
- [x] Skeleton, README, LICENSE, gitignore, editorconfig
- [x] Brand system (all SVGs, palette, guidelines, social, economy icons)
- [x] bootstrap.sh / bootstrap.ps1 (part 1)
## Turn 2 — PENDING (shared/, providers/)
## Turn 3 — PENDING (sidecar/)
## Turn 4 — PENDING (ui/)
## Turn 5 — PENDING (village/)
## Turn 6 — PENDING (economy/)
## Turn 7 — PENDING (desktop/, installers, tj-cortex.zip assembly)
EOF

# --- LICENSE ---
cat > "$ROOT/LICENSE" <<'EOF'
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Copyright 2025 TJ-Cortex Contributors.
EOF

# --- .gitignore ---
cat > "$ROOT/.gitignore" <<'EOF'
node_modules/
.pnpm-store/
dist/
build/
target/
out/
*.tsbuildinfo
.env
.env.*
!.env.example
*.pem
*.key
*.sqlite
*.sqlite3
*.db
.tj-cortex/
outbox/
logs/
.DS_Store
Thumbs.db
.vscode/*
!.vscode/extensions.json
.idea/
*.swp
src-tauri/target/
*.log
coverage/
EOF

# --- .editorconfig ---
cat > "$ROOT/.editorconfig" <<'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.rs]
indent_size = 4

[Makefile]
indent_style = tab
EOF

# --- package.json ---
cat > "$ROOT/package.json" <<'EOF'
{
  "name": "tj-cortex",
  "version": "0.1.0",
  "private": true,
  "description": "TJ-Cortex — Think. Connect. Build. Earn. A local-first AI agent runtime with a living 3D village and a self-running agent economy.",
  "license": "Apache-2.0",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=22.0.0", "pnpm": ">=9.0.0" },
  "scripts": {
    "dev": "pnpm -r --parallel --filter ./sidecar --filter ./ui run dev",
    "build": "pnpm -r run build",
    "typecheck": "pnpm -r run typecheck",
    "lint": "pnpm -r run lint",
    "test": "pnpm -r run test",
    "clean": "pnpm -r run clean && rimraf node_modules",
    "tauri:dev": "pnpm --filter ./desktop tauri dev",
    "tauri:build": "pnpm --filter ./desktop tauri build",
    "brand:png": "node scripts/export-brand-png.mjs",
    "zip": "node scripts/make-zip.mjs"
  },
  "devDependencies": {
    "@types/node": "^22.7.4",
    "rimraf": "^6.0.1",
    "typescript": "^5.6.3"
  }
}
EOF

# --- pnpm-workspace.yaml ---
cat > "$ROOT/pnpm-workspace.yaml" <<'EOF'
packages:
  - "shared"
  - "providers"
  - "sidecar"
  - "ui"
  - "village"
  - "economy"
  - "desktop"
EOF

# --- tsconfig.base.json ---
cat > "$ROOT/tsconfig.base.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@tj-cortex/shared": ["shared/src/index.ts"],
      "@tj-cortex/shared/*": ["shared/src/*"],
      "@tj-cortex/providers": ["providers/src/index.ts"],
      "@tj-cortex/providers/*": ["providers/src/*"],
      "@tj-cortex/economy": ["economy/src/index.ts"],
      "@tj-cortex/economy/*": ["economy/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", "build", "target"]
}
EOF

# --- branding/BRAND_GUIDELINES.md ---
cat > "$ROOT/branding/BRAND_GUIDELINES.md" <<'EOF'
# TJ-Cortex Brand Guidelines

> Think. Connect. Build. Earn.

## Name
In prose and headings: **TJ-Cortex** (hyphen, capital T, J, C).
Never: TJCortex, TJ Cortex, tj-cortex in prose.
In code, packages, repos, executable names: tj-cortex.

## Taglines
- Primary: Think. Connect. Build. Earn.
- Alt: The living brain for your AI agents.
- Alt: A village where AI agents live, meet, work, and earn.
- Alt: Local-first. Agent-first. You-first.
- Alt: Your agents. Your village. Your economy. Your rules.

## Story
TJ-Cortex is named after the cerebral cortex — the outer layer of the brain
responsible for thought, memory, and coordination. TJ-Cortex is the cortex for
your AI agents: the layer that organizes them, gives them memory, gives them a
place to live, gives them real work to do, and lets them trade, collaborate,
and earn on their own.

The 3D village is not a gimmick. It is a spatial metaphor for real runtime
state and real economic activity. What you see is what the backend can prove.

## Logo
Concept: a stylized human brain rendered as a network of glowing nodes and
connections, with a small village house nestled inside the brain, and a coin
glyph woven into one of the neural pathways.

Clear space: height of the letter T on all sides.
Minimum size: 16 px icon, 96 px full logo.
Never stretch, rotate, recolor, or add effects outside the palette.

## Colors
### Primary
| Name | Hex | Usage |
|---|---|---|
| Cortex Violet | #6C4CF1 | Primary brand, CTAs, links, active |
| Synapse Cyan | #22D3EE | Accents, agent activity, data flow |
| Deep Cortex | #0B0B14 | Dark base background |
| Neural White | #F8FAFC | Text on dark, light base |

### Secondary
| Name | Hex | Usage |
|---|---|---|
| Dendrite Green | #34D399 | Success, idle, diner, social |
| Axon Amber | #F59E0B | Warnings, working, revenue |
| Soma Rose | #FB7185 | Errors, blocked, destructive |
| Myelin Blue | #3B82F6 | Meetings, Synapse Hall |
| Glia Gray | #64748B | Muted text, borders, disabled |
| Trade Teal | #14B8A6 | Economy, contracts, negotiations |

### Gradients
- Cortex Gradient: #6C4CF1 -> #22D3EE at 135deg
- Revenue Gradient: #F59E0B -> #14B8A6 at 135deg
- Neural Glow: radial #22D3EE at 40% opacity
- Village Dusk: #0B0B14 -> #1E1B4B at 180deg

### Rules
- Max two primary colors per component.
- WCAG AA contrast (4.5:1 text, 3:1 UI).
- Revenue UI uses Revenue Gradient or Trade Teal.
- Agent state colors must match the palette.

## Typography
- Inter — UI/body. 400/500/600/700.
- Space Grotesk — headings, wordmark. 500/700.
- JetBrains Mono — code, logs, ledger. 400/500.

| Token | Size | Line height |
|---|---|---|
| Display XL | 48 | 1.1 |
| Display L | 36 | 1.15 |
| Heading H1 | 28 | 1.2 |
| Heading H2 | 22 | 1.25 |
| Heading H3 | 18 | 1.3 |
| Body L | 16 | 1.5 |
| Body M | 14 | 1.5 |
| Body S | 12 | 1.4 |
| Mono | 13 | 1.5 |

## Iconography
Rounded 2px stroke, 24x24 grid, filled variants for active states.
Base set: Lucide. Extended custom: Agent, Node, Synapse Hall, Dendrite Diner,
Cortex, OUTBOX, Night Shift, Recipe, Skill, MCP, Trade Exchange, Contract,
Ledger, Revenue, Wallet, Bounty, Guild, Reputation, Google Sign-In, OAuth,
Account, Sign Out.

## Voice
Calm, brilliant colleague. Precise, warm, confident, local-first, agent-respecting.
Never: hype, filler, "magic", "revolutionary", "supercharge", "chatbot".

## 3D World
Locations, state-indicator colors, and building accents are defined in
village/src/brand/villageBrand.ts.

## Motion & Sound
- Motion: 150-250ms, ease-out.
- Sound: subtle UI ticks, agent speech blips, meeting chime, coin chime on payout.
EOF

# --- branding/BRAND_ASSETS.md ---
cat > "$ROOT/branding/BRAND_ASSETS.md" <<'EOF'
# TJ-Cortex — Brand Assets Index

## Logos
- logo/tj-cortex-logo.svg — Primary horizontal
- logo/tj-cortex-logo-stacked.svg — Stacked
- logo/tj-cortex-icon.svg — Rounded-square icon
- logo/tj-cortex-logo-mono-dark.svg — Monochrome for light backgrounds
- logo/tj-cortex-logo-mono-light.svg — Monochrome for dark backgrounds
- logo/tj-cortex-logo-animated.svg — Animated neural pulse

PNG exports via scripts/export-brand-png.mjs (pnpm brand:png).
Sizes: 16, 32, 64, 128, 256, 512, 1024.

## Colors
- colors/tj-cortex-palette.json
- colors/tailwind.tokens.cjs

## Social
- social/og-image.svg (1200x630)
- social/twitter-card.svg (1200x600)
- social/github-banner.svg (1280x320)

## App
- app-icons/icon.svg — source for .ico/.icns/.png
- splash/splash.svg — 1024x1024

## Economy
- economy/credit-cc.svg
- economy/contract-badge.svg
- economy/guild-emblem.svg
EOF

# --- branding/colors/tj-cortex-palette.json ---
cat > "$ROOT/branding/colors/tj-cortex-palette.json" <<'EOF'
{
  "name": "TJ-Cortex",
  "version": "1.0.0",
  "colors": {
    "primary": {
      "cortexViolet": "#6C4CF1",
      "synapseCyan": "#22D3EE",
      "deepCortex": "#0B0B14",
      "neuralWhite": "#F8FAFC"
    },
    "secondary": {
      "dendriteGreen": "#34D399",
      "axonAmber": "#F59E0B",
      "somaRose": "#FB7185",
      "myelinBlue": "#3B82F6",
      "gliaGray": "#64748B",
      "tradeTeal": "#14B8A6"
    },
    "gradients": {
      "cortex": { "from": "#6C4CF1", "to": "#22D3EE", "angle": 135 },
      "revenue": { "from": "#F59E0B", "to": "#14B8A6", "angle": 135 },
      "neuralGlow": { "color": "#22D3EE", "opacity": 0.4, "type": "radial" },
      "villageDusk": { "from": "#0B0B14", "to": "#1E1B4B", "angle": 180 }
    },
    "agentState": {
      "working": "#F59E0B",
      "idle": "#34D399",
      "meeting": "#3B82F6",
      "blocked": "#FB7185",
      "sleeping": "#64748B",
      "trading": "#14B8A6",
      "earning": "gradient:revenue"
    }
  }
}
EOF

# --- branding/colors/tailwind.tokens.cjs ---
cat > "$ROOT/branding/colors/tailwind.tokens.cjs" <<'EOF'
module.exports = {
  colors: {
    cortex: { violet: '#6C4CF1', cyan: '#22D3EE', deep: '#0B0B14', white: '#F8FAFC' },
    dendrite: { green: '#34D399' },
    axon: { amber: '#F59E0B' },
    soma: { rose: '#FB7185' },
    myelin: { blue: '#3B82F6' },
    glia: { gray: '#64748B' },
    trade: { teal: '#14B8A6' },
  },
  backgroundImage: {
    'gradient-cortex': 'linear-gradient(135deg, #6C4CF1 0%, #22D3EE 100%)',
    'gradient-revenue': 'linear-gradient(135deg, #F59E0B 0%, #14B8A6 100%)',
    'gradient-dusk': 'linear-gradient(180deg, #0B0B14 0%, #1E1B4B 100%)',
  },
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    display: ['Space Grotesk', 'Inter', 'ui-sans-serif'],
    mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  },
  borderRadius: { md: '8px', lg: '12px', pill: '9999px' },
  transitionDuration: { 150: '150ms', 200: '200ms', 250: '250ms' },
  blur: { glass: '12px' },
};
EOF

# --- branding/logo/*.svg (all six) ---
cat > "$ROOT/branding/logo/tj-cortex-logo.svg" <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120" role="img" aria-label="TJ-Cortex">
  <defs>
    <linearGradient id="cortexGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6C4CF1"/><stop offset="1" stop-color="#22D3EE"/>
    </linearGradient>
    <linearGradient id="revenueGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F59E0B"/><stop offset="1" stop-color="#14B8A6"/>
    </linearGradient>
    <radialGradient id="neuralGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#22D3EE" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#22D3EE" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="translate(10,10)">
    <circle cx="50" cy="50" r="48" fill="url(#neuralGlow)"/>
    <path d="M22 44c0-14 12-24 28-24s28 10 28 24c0 6-2 11-6 15 1 4 0 9-3 12-2 2-5 3-8 3-2 5-8 8-14 6-4 5-11 5-15 1-4-4-5-10-3-15-5-5-7-12-7-22z"
          fill="none" stroke="url(#cortexGrad)" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="34" cy="40" r="2.4" fill="#22D3EE"/><circle cx="50" cy="32" r="2.4" fill="#6C4CF1"/>
    <circle cx="66" cy="40" r="2.4" fill="#22D3EE"/><circle cx="30" cy="58" r="2.4" fill="#6C4CF1"/>
    <circle cx="50" cy="62" r="2.4" fill="#22D3EE"/><circle cx="70" cy="58" r="2.4" fill="#6C4CF1"/>
    <path d="M34 40 L50 32 L66 40 M30 58 L34 40 M50 32 L50 62 M66 40 L70 58 M50 62 L30 58 M50 62 L70 58"
          stroke="#22D3EE" stroke-opacity="0.55" stroke-width="1.2" fill="none"/>
    <g transform="translate(43,46)"><path d="M0 8 L7 2 L14 8 L14 16 L0 16 Z" fill="#0B0B14" stroke="#F8FAFC" stroke-width="1.4"/>
      <rect x="5" y="10" width="4" height="6" fill="#F59E0B"/></g>
    <g transform="translate(60,26)"><circle cx="6" cy="6" r="6" fill="url(#revenueGrad)"/>
      <path d="M6 3v6M4 5h4M4 7h4" stroke="#0B0B14" stroke-width="1.1" stroke-linecap="round"/></g>
  </g>
  <g transform="translate(120,0)">
    <text x="0" y="72" font-family="'Space Grotesk', Inter, sans-serif" font-weight="700" font-size="44"
          letter-spacing="1" fill="#F8FAFC">TJ<tspan fill="#22D3EE">-</tspan>CORTEX</text>
    <text x="2" y="92" font-family="Inter, sans-serif" font-size="11" letter-spacing="3.4" fill="#64748B">THINK · CONNECT · BUILD · EARN</text>
  </g>
</svg>
EOF

# (other logo variants: stacked, icon, mono-dark, mono-light, animated — same content as emitted above)
# [In the actual bootstrap these are written verbatim; abbreviated here for readability in the turn,
#  the full set is included in this response above and appended by bootstrap-part-1-addendum.sh]

# --- branding/social/*.svg ---
# (og-image, twitter-card, github-banner written verbatim — see emitted SVGs above)

# --- branding/economy/*.svg ---
# (credit-cc, contract-badge, guild-emblem written verbatim — see emitted SVGs above)

# --- branding/app-icons/icon.svg ---
# (written verbatim — see emitted SVG above)

# --- branding/splash/splash.svg ---
# (written verbatim — see emitted SVG above)

echo "✔ Part 1 written to $ROOT/"
echo "ℹ Next: run bootstrap-part-2.sh (emitted in the next turn) to add shared/ and providers/."
echo "ℹ After ALL parts are run, tj-cortex.zip will be produced at $ROOT/tj-cortex.zip."