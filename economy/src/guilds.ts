import { randomUUID } from 'node:crypto';
import type { Guild } from '@tj-cortex/shared';
import type { EconomyStore, EconomyEmit } from './types.js';

/**
 * Guilds. A guild is a named group of agents with a shared purpose and a
 * deterministic emblem seed (used by the 3D Guild Hall for a visual identity).
 */

export interface CreateGuildInput {
  name: string;
  purpose: string;
  foundingAgentIds: string[];
}

export function create(
  store: EconomyStore,
  emit: EconomyEmit,
  input: CreateGuildInput,
): Guild {
  const now = Date.now();
  const g: Guild = {
    id: randomUUID(),
    name: input.name,
    purpose: input.purpose,
    emblemSeed: randomUUID().slice(0, 8),
    memberAgentIds: [...input.foundingAgentIds],
    createdAt: now,
  };
  store.insertGuild(g);
  emit({ type: 'guild.updated', payload: g });
  return g;
}

export function join(
  store: EconomyStore,
  emit: EconomyEmit,
  guildId: string,
  agentId: string,
): Guild {
  const g = store.getGuild(guildId);
  if (!g) throw new Error('guild not found');
  if (g.memberAgentIds.includes(agentId)) return g;
  const next: Guild = { ...g, memberAgentIds: [...g.memberAgentIds, agentId] };
  store.updateGuild(next);
  emit({ type: 'guild.updated', payload: next });
  return next;
}

export function leave(
  store: EconomyStore,
  emit: EconomyEmit,
  guildId: string,
  agentId: string,
): Guild {
  const g = store.getGuild(guildId);
  if (!g) throw new Error('guild not found');
  const next: Guild = { ...g, memberAgentIds: g.memberAgentIds.filter((x) => x !== agentId) };
  store.updateGuild(next);
  emit({ type: 'guild.updated', payload: next });
  return next;
}