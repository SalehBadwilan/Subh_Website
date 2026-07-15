/**
 * Express application composition.
 *
 * Wires middleware, registers routes, and installs a centralized error
 * handler. The HTTP server (listen) lives in server.js so that app can be
 * tested/imported without binding a port.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import env, { validateEnv } from './config/env.js';
import logger from './config/logger.js';
import { bootDatabase, testDatabaseConnection } from './config/database.js';

import healthRoutes from './routes/healthRoutes.js';
import aiDemoRoutes from './routes/aiDemoRoutes.js';

const app = express();

// --- Security & observability middleware -------------------------------------
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  morgan(env.isProd ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }),
);

// --- Routes ------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    name: 'Subh Backend',
    architecture: 'Modular Monolith',
    version: '0.2.0',
    endpoints: ['/api/health', '/api/ai-status'],
    note: 'Database schema (33 tables) created via Sequelize migrations. Run `npm run db:migrate`.',
  });
});

app.use('/api', healthRoutes);
app.use('/api', aiDemoRoutes);

// --- 404 ---------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not Found' });
});

// --- Centralized error handler ----------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    ok: false,
    error: env.isProd ? 'Internal Server Error' : err.message,
  });
});

/**
 * Boot the application layer: validate env, connect DB, register models.
 * Called by server.js before listen().
 */
export async function bootApp() {
  validateEnv();
  logger.info(`Validating environment ... dialect=${env.db.dialect}`);

  const { models } = await bootDatabase();
  logger.info(`Database connection established. ${Object.keys(models).length} models registered.`);

  return { app, models };
}

export { testDatabaseConnection };
export default app;
