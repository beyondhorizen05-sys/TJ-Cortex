import type { Building } from '@tj-cortex/shared';

/**
 * Village brand constants. Kept in one place so both the world geometry and
 * the UI can reference the same accent colors, names, and location ids.
 */

export const VILLAGE_NAME = 'The Cortex Village';

export const VILLAGE_COLORS = {
  ground: '#0F1117',
  path: '#1C1F2A',
  water: '#0C2433',
  dusk: '#1E1B4B',
  day: '#8ECBFF',
  night: '#0B0B14',
  fog: '#1E1B4B',
  cortexViolet: '#6C4CF1',
  synapseCyan: '#22D3EE',
  dendriteGreen: '#34D399',
  axonAmber: '#F59E0B',
  somaRose: '#FB7185',
  myelinBlue: '#3B82F6',
  gliaGray: '#64748B',
  tradeTeal: '#14B8A6',
} as const;

/**
 * Canonical footprint of every branded building. The world is laid out on a
 * cross: residential ring around a central plaza, commerce on the east,
 * guild/bank on the north, hall on the south, diner on the west.
 */
export const BUILDINGS: Building[] = [
  { id: 'soma_plaza',      brandName: 'Soma Plaza',      cx:   0, cz:   0, sx: 16, sz: 16, accentColor: VILLAGE_COLORS.synapseCyan, capacity: 32 },
  { id: 'synapse_hall',    brandName: 'Synapse Hall',    cx:   0, cz:  22, sx: 18, sz: 12, accentColor: VILLAGE_COLORS.myelinBlue,   capacity: 16 },
  { id: 'dendrite_diner',  brandName: 'Dendrite Diner',  cx: -26, cz:   0, sx: 14, sz: 14, accentColor: VILLAGE_COLORS.dendriteGreen, capacity: 12 },
  { id: 'axon_desk',       brandName: 'Axon Desk',       cx:  24, cz: -12, sx: 12, sz: 12, accentColor: VILLAGE_COLORS.axonAmber,    capacity: 8  },
  { id: 'trade_exchange',  brandName: 'Trade Exchange',  cx:  26, cz:  10, sx: 16, sz: 14, accentColor: VILLAGE_COLORS.tradeTeal,    capacity: 12 },
  { id: 'guild_hall',      brandName: 'Guild Hall',      cx:  14, cz: -28, sx: 14, sz: 14, accentColor: VILLAGE_COLORS.cortexViolet, capacity: 12 },
  { id: 'myelin_bank',     brandName: 'Myelin Bank',     cx: -14, cz: -28, sx: 14, sz: 14, accentColor: VILLAGE_COLORS.tradeTeal,    capacity: 8  },
  { id: 'outbox',          brandName: 'OUTBOX',          cx: -22, cz:  18, sx: 10, sz: 10, accentColor: VILLAGE_COLORS.axonAmber,    capacity: 4  },
  { id: 'node',            brandName: 'Node',            cx:   0, cz: -14, sx:  8, sz:  8, accentColor: VILLAGE_COLORS.cortexViolet, capacity: 1  },
];

/**
 * Small residential pods — one per agent — fanned out behind the Node.
 * They are not separate ids: they are decoration attached to the Node.
 */
export const RESIDENTIAL_PODS = 12;

/**
 * Where an agent should stand given its current state.
 *   working   -> in front of its own Node
 *   idle      -> Dendrite Diner
 *   meeting   -> Synapse Hall
 *   trading   -> Trade Exchange
 *   earning   -> Trade Exchange (revenue pulse)
 *   sleeping  -> its own Node (inside)
 *   blocked   -> Soma Plaza (waiting for the user)
 */
export function targetLocationForState(state: string): Building['id'] {
  switch (state) {
    case 'working':  return 'node';
    case 'idle':     return 'dendrite_diner';
    case 'meeting':  return 'synapse_hall';
    case 'trading':
    case 'earning':  return 'trade_exchange';
    case 'sleeping': return 'node';
    case 'blocked':  return 'soma_plaza';
    default:         return 'soma_plaza';
  }
}

export const STATE_COLORS = {
  working: VILLAGE_COLORS.axonAmber,
  idle: VILLAGE_COLORS.dendriteGreen,
  meeting: VILLAGE_COLORS.myelinBlue,
  blocked: VILLAGE_COLORS.somaRose,
  sleeping: VILLAGE_COLORS.gliaGray,
  trading: VILLAGE_COLORS.tradeTeal,
  earning: VILLAGE_COLORS.axonAmber,
} as const;