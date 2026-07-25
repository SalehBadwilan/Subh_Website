/**
 * Health route.
 *
 * GET /api/health
 * Reports server uptime and the real-time database connection status.
 * Used as the primary liveness/readiness probe.
 */
import { Router } from 'express';
import { testDatabaseConnection } from '../config/database.js';
import env from '../config/env.js';

const router = Router();

const startedAt = Date.now();

router.get('/health', async (_req, res) => {
  const database = await testDatabaseConnection();

  // Overall "ok" = database is reachable. The server itself is obviously up
  // if it can answer, so we key the status off the dependency.
  const ok = database.status === 'connected';

  res.status(ok ? 200 : 503).json({
    status: ok ? 'healthy' : 'unhealthy',
    ok,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    environment: env.nodeEnv,
    database,
  });
});

export default router;
