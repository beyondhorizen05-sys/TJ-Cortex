import { z } from 'zod';

export const CrewClass = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  role: z.enum(['generalist','researcher','engineer','writer','analyst','trader','negotiator','coordinator']),
  tier: z.enum(['builtin','archive']),
  suggestedTools: z.array(z.string()).default([]),
});
export type CrewClass = z.infer<typeof CrewClass>;

/**
 * TJ-Cortex crew catalog.
 *
 * This mirrors the current StarNet crew-class surface as functionality, not its
 * pixel-art presentation or artwork. The descriptions are intentionally original.
 * Each class is a reusable agent blueprint; creating an agent is a separate
 * operation so the catalog never silently creates model runs or spends money.
 */
export const CREW_CLASSES: readonly CrewClass[] = [
  { id: 'chief', name: 'Chief of Staff', summary: 'General-purpose coordination, triage, planning, and keeping work moving.', role: 'coordinator', tier: 'builtin', suggestedTools: ['memory', 'fs', 'task_brief'] },
  { id: 'researcher', name: 'Researcher', summary: 'Investigates questions, cross-checks sources, and produces evidence-backed briefs.', role: 'researcher', tier: 'builtin', suggestedTools: ['http', 'memory', 'fs'] },
  { id: 'engineer', name: 'Engineer', summary: 'Builds, debugs, tests, and maintains software and technical systems.', role: 'engineer', tier: 'builtin', suggestedTools: ['shell', 'fs', 'mcp'] },
  { id: 'scribe', name: 'Scribe', summary: 'Turns rough material into clear structured documents and records.', role: 'writer', tier: 'builtin', suggestedTools: ['fs', 'memory'] },
  { id: 'analyst', name: 'Analyst', summary: 'Inspects data, performs reproducible analysis, and explains the result.', role: 'analyst', tier: 'builtin', suggestedTools: ['fs', 'shell', 'memory'] },
  { id: 'operator', name: 'Operator', summary: 'Executes defined procedures, monitors work, and reports concrete outcomes.', role: 'generalist', tier: 'builtin', suggestedTools: ['fs', 'shell', 'mcp'] },
  { id: 'scout', name: 'Scout', summary: 'Finds relevant opportunities, information, changes, and useful leads.', role: 'researcher', tier: 'builtin', suggestedTools: ['http', 'memory'] },
  { id: 'designer', name: 'Designer', summary: 'Shapes interfaces, user flows, visual systems, and creative specifications.', role: 'generalist', tier: 'builtin', suggestedTools: ['fs', 'browser', 'memory'] },
  { id: 'tutor', name: 'Tutor', summary: 'Explains concepts, creates study plans, and adapts explanations to the learner.', role: 'generalist', tier: 'builtin', suggestedTools: ['http', 'memory', 'fs'] },
  { id: 'navigator', name: 'Navigator', summary: 'Plans trips and logistics using current schedules, prices, and constraints.', role: 'generalist', tier: 'builtin', suggestedTools: ['http', 'memory'] },
  { id: 'curator', name: 'Curator', summary: 'Organizes local files conservatively with reversible, auditable changes.', role: 'generalist', tier: 'builtin', suggestedTools: ['fs', 'memory'] },
  { id: 'muse', name: 'Muse', summary: 'Generates divergent ideas, then converges them into practical concepts.', role: 'generalist', tier: 'builtin', suggestedTools: ['memory', 'fs'] },
  { id: 'reviewer', name: 'Reviewer', summary: 'Challenges work, reproduces problems, and verifies fixes before delivery.', role: 'analyst', tier: 'archive', suggestedTools: ['fs', 'shell', 'browser'] },
  { id: 'auditor', name: 'Auditor', summary: 'Performs security, consistency, and evidence checks across files and systems.', role: 'analyst', tier: 'archive', suggestedTools: ['fs', 'shell', 'mcp'] },
  { id: 'liaison', name: 'Liaison', summary: 'Coordinates people, agents, and external workstreams while preserving context.', role: 'coordinator', tier: 'archive', suggestedTools: ['messaging', 'memory'] },
  { id: 'publicist', name: 'Publicist', summary: 'Prepares announcements and outward-facing communication for approval.', role: 'writer', tier: 'archive', suggestedTools: ['messaging', 'http', 'fs'] },
  { id: 'herald', name: 'Herald', summary: 'Compiles recurring digests and prepares scheduled broadcasts.', role: 'writer', tier: 'archive', suggestedTools: ['messaging', 'http', 'memory'] },
  { id: 'broker', name: 'Broker', summary: 'Compares options, prices, terms, and trade-offs using current evidence.', role: 'trader', tier: 'archive', suggestedTools: ['http', 'memory', 'economy'] },
  { id: 'bookkeeper', name: 'Bookkeeper', summary: 'Maintains financial records, budgets, expense trails, and reconciliations.', role: 'analyst', tier: 'archive', suggestedTools: ['economy', 'fs', 'memory'] },
  { id: 'translator', name: 'Translator', summary: 'Translates and localizes documents while preserving meaning and terminology.', role: 'writer', tier: 'archive', suggestedTools: ['fs', 'memory'] },
  { id: 'archivist', name: 'Archivist', summary: 'Organizes durable knowledge, references, and historical records for retrieval.', role: 'generalist', tier: 'archive', suggestedTools: ['fs', 'memory'] },
];

export function getCrewClass(id: string): CrewClass | undefined {
  return CREW_CLASSES.find((crewClass) => crewClass.id === id);
}
