import type { FastifyInstance } from 'fastify';
import { CREW_CLASSES } from '@tj-cortex/shared';

export async function registerCrewRoutes(app: FastifyInstance) {
  app.get('/crew/classes', async () => ({
    classes: CREW_CLASSES,
    builtin: CREW_CLASSES.filter((item) => item.tier === 'builtin'),
    archive: CREW_CLASSES.filter((item) => item.tier === 'archive'),
  }));
}
