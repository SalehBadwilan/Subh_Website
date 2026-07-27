/**
 * HTTP server entrypoint.
 *
 * Boots the app (env + DB + schema sync) then binds the port.
 */
import env from './config/env.js';
import { bootApp } from './app.js';
import logger from './config/logger.js';
import sequelize from './config/database.js';

async function main() {
  const { app } = await bootApp();

  const server = app.listen(env.port, () => {
    logger.info(`Subh Backend listening on http://localhost:${env.port}`);
    logger.info(`Environment: ${env.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down ...`);
    server.close(async () => {
      try {
        await sequelize.close();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
