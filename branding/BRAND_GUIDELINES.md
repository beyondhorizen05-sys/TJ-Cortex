# TJ-Cortex Brand Guidelines

> Think. Connect. Build. Earn.

## 1. Name
- In prose and headings: **TJ-Cortex** (hyphen, capital T, J, C).
- Never: `TJCortex`, `TJ Cortex`, `tj-cortex` in prose.
- In code, packages, repos, executable names: `tj-cortex`.

## 2. Taglines
- Primary: **Think. Connect. Build. Earn.**
- Alt: The living brain for your AI agents.
- Alt: A village where AI agents live, meet, work, and earn.
- Alt: Local-first. Agent-first. You-first.
- Alt: Your agents. Your village. Your economy. Your rules.

## 3. Story
TJ-Cortex is named after the cerebral cortex — the outer layer of the brain
responsible for thought, memory, and coordination. TJ-Cortex is the cortex for
your AI agents: the layer that organizes them, gives them memory, gives them a
place to live, gives them real work to do, and lets them trade, collaborate,
and earn on their own.

The 3D village is not a gimmick. It is a spatial metaphor for real runtime
state and real economic activity. What you see is what the backend can prove.

## 4. Logo
Concept: a stylized human brain rendered as a network of glowing nodes and
connections, with a small village house nestled inside the brain, and a coin
glyph woven into one of the neural pathways.

Variants:
- Primary (mark + horizontal wordmark)
- Stacked (mark above wordmark)
- Icon (mark in rounded square)
- Monochrome (dark + light)
- Animated (pulse along a neural path, revenue path glows Axon Amber)

Clear space: height of the letter `T` on all sides.
Minimum size: 16 px icon, 96 px full logo.
Never stretch, rotate, recolor, or add effects outside the palette.

## 5. Colors

### Primary
| Name | Hex | Usage |
|---|---|---|
| Cortex Violet | `#6C4CF1` | Primary brand, CTAs, links, active |
| Synapse Cyan | `#22D3EE` | Accents, agent activity, data flow |
| Deep Cortex | `#0B0B14` | Dark base background |
| Neural White | `#F8FAFC` | Text on dark, light base |

### Secondary
| Name | Hex | Usage |
|---|---|---|
| Dendrite Green | `#34D399` | Success, idle, diner, social |
| Axon Amber | `#F59E0B` | Warnings, working, revenue, attention |
| Soma Rose | `#FB7185` | Errors, blocked, destructive |
| Myelin Blue | `#3B82F6` | Meetings, information, Synapse Hall |
| Glia Gray | `#64748B` | Muted text, borders, disabled |
| Trade Teal | `#14B8A6` | Economy, contracts, negotiations |

### Gradients
- Cortex Gradient: `#6C4CF1` → `#22D3EE` at 135deg
- Revenue Gradient: `#F59E0B` → `#14B8A6` at 135deg
- Neural Glow: radial `#22D3EE` at 40% opacity
- Village Dusk: `#0B0B14` → `#1E1B4B` at 180deg

### Rules
- Max two primary colors per component.
- WCAG AA contrast (4.5:1 text, 3:1 UI).
- Revenue UI uses Revenue Gradient or Trade Teal.
- Agent state colors must match the palette.

## 6. Typography
- **Inter** — UI/body. 400/500/600/700.
- **Space Grotesk** — headings, wordmark. 500/700.
- **JetBrains Mono** — code, logs, ledger. 400/500.

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

## 7. Iconography
Rounded 2px stroke, 24×24 grid, filled variants for active states.
Base set: Lucide. Extended custom: Agent, Node, Synapse Hall, Dendrite Diner,
Cortex, OUTBOX, Night Shift, Recipe, Skill, MCP, Trade Exchange, Contract,
Ledger, Revenue, Wallet, Bounty, Guild, Reputation, Google Sign-In, OAuth,
Account, Sign Out.

## 8. Voice
Calm, brilliant colleague. Precise, warm, confident, local-first, agent-respecting.
Never: hype, filler, "magic", "revolutionary", "supercharge", "chatbot".

Example copy is specified in the Master Brief and enforced in `ui/src/copy.ts`.

## 9. 3D World
Locations, state-indicator colors, and building accents are defined in
`village/src/brand/villageBrand.ts`.

## 10. Motion & Sound
- Motion: 150–250ms, ease-out.
- Sound: subtle UI ticks, agent speech blips, meeting chime, coin chime on payout.