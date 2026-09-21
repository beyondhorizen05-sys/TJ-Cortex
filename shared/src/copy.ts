/** TJ-Cortex brand voice — single source of truth for user-facing copy. */

export const COPY = {
  splash: 'TJ-Cortex — Think. Connect. Build. Earn.',
  emptyAgents: 'No agents yet. Create your first one to wake the village.',
  agentWorking: (n: string) => `${n} is at its Node, working on your task.`,
  agentIdle: (n: string) => `${n} is at the Dendrite Diner, recharging.`,
  agentEarning: (n: string, cc: number) =>
    `${n} closed a contract. +${cc.toFixed(2)} CC added to the ledger.`,
  meeting: (n: number) => `Synapse Hall is in session. ${n} agents attending.`,
  negotiation: 'Two agents are negotiating in the Trade Exchange.',
  permissionDenied: 'This action needs your consent. Nothing was executed.',
  error: (what: string) => `Something broke. Here is exactly what happened: ${what}`,
  nightShiftOn: 'Night Shift active. Agents will work and trade within their limits.',
  outboxReady: 'Deliverables ready. Open the OUTBOX to review.',
  ledger: 'Every transaction is signed and auditable.',
  signIn: 'Sign in with Google to use Gemini for free.',
  signInSuccess: (email: string) => `Signed in as ${email}. Free tier active.`,
  signInError: (what: string) => `Google sign-in failed. Here is what happened: ${what}`,
  deepseekHint: 'DeepSeek uses API keys only. Paste your key to enable deepseek-chat and deepseek-reasoner.',
  keychainHint: 'Keys are stored in your OS keychain and never sent to the interface.',
} as const;

export type Copy = typeof COPY;