import { BUILDINGS, RESIDENTIAL_PODS } from '../brand/villageBrand';

export interface Vec2 { x: number; z: number }

/**
 * Dead-simple steering: agents walk straight toward their target until they
 * arrive within `arriveRadius`, at which point they enter an idle sway. If a
 * future turn introduces real obstacles, this is where yuka or recast-navigation
 * would plug in.
 */

export function buildingCenter(id: string): Vec2 {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) return { x: 0, z: 0 };
  return { x: b.cx, z: b.cz };
}

/** A point just outside a building's front door, deterministically placed. */
export function approachPoint(id: string, agentIndex: number): Vec2 {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) return { x: 0, z: 0 };
  const angle = (agentIndex / Math.max(1, b.capacity)) * Math.PI * 2;
  const r = Math.max(b.sx, b.sz) / 2 + 1.6;
  return { x: b.cx + Math.cos(angle) * r, z: b.cz + Math.sin(angle) * r };
}

/** A point near a residential pod, for working/sleeping states. */
export function podPoint(agentIndex: number): Vec2 {
  const i = agentIndex % RESIDENTIAL_PODS;
  const col = i % 4;
  const row = Math.floor(i / 4);
  return { x: -9 + col * 6, z: -32 - row * 6 };
}

export function stepToward(
  from: Vec2,
  to: Vec2,
  dt: number,
  speed = 3.2,
  arriveRadius = 0.4,
): { pos: Vec2; heading: number; arrived: boolean } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d < arriveRadius) return { pos: from, heading: Math.atan2(dx, dz), arrived: true };
  const step = Math.min(speed * dt, d);
  const nx = from.x + (dx / d) * step;
  const nz = from.z + (dz / d) * step;
  return { pos: { x: nx, z: nz }, heading: Math.atan2(dx, dz), arrived: false };
}

/** Shortest path from current heading to desired heading, in radians. */
export function shortestAngle(from: number, to: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}