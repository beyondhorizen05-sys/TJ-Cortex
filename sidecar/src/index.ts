import { start } from './server.js';
import { logger } from './logger.js';

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'uncaught exception');
});

start().catch((err) => {
  logger.fatal({ err }, 'sidecar failed to start');
  process.exit(1);
});