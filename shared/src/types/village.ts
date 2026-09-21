import { z } from 'zod';
import { LOCATION_IDS } from '../constants.js';

export const VillageTime = z.object({
  /** 0..1 where 0 = midnight, 0.5 = noon. */
  dayFraction: z.number().min(0).max(1),
  /** Real seconds per in-game hour. */
  timeScale: z.number().positive().default(60),
  isNight: z.boolean(),
});
export type VillageTime = z.infer<typeof VillageTime>;

export const VillageWeather = z.enum(['clear', 'rain', 'fog']);
export type VillageWeather = z.infer<typeof VillageWeather>;

export const VillagePosition = z.object({
  agentId: z.string(),
  location: z.enum(LOCATION_IDS),
  x: z.number(),
  z: z.number(),
  heading: z.number().default(0),
  state: z.string(),
});
export type VillagePosition = z.infer<typeof VillagePosition>;

export const Building = z.object({
  id: z.enum(LOCATION_IDS),
  brandName: z.string(),
  /** Footprint centre in world coords. */
  cx: z.number(),
  cz: z.number(),
  /** Footprint size (x by z). */
  sx: z.number(),
  sz: z.number(),
  accentColor: z.string(),
  capacity: z.number().int().positive().default(8),
});
export type Building = z.infer<typeof Building>;