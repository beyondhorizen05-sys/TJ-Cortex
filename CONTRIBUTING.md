# Contributing to TJ-Cortex

Thanks for considering a contribution. TJ-Cortex is a local-first AI agent
runtime; we take the brand voice and the runtime guarantees seriously.

## Ground rules

1. **Local-first.** Do not introduce any network call that is not behind an
   explicit user configuration.
2. **Real, not simulated.** Never make the UI show a state or an amount the
   backend cannot prove. If you add a new visual, add the backend field that
   backs it.
3. **Permissioned by default.** New tools must declare a risk and go through
   `invokeTool`.
4. **Brand consistency.** Follow `branding/BRAND_GUIDELINES.md`. Use the
   Tailwind tokens, the type scale, and the motion durations.
5. **Voice.** Read `shared/src/copy.ts` before writing user-facing strings.

## Getting set up

```bash
./bootstrap.sh
pnpm install
pnpm dev