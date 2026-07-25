/**
 * Express application composition.
 *
 * Wires middleware, registers the API router (all CRUD modules), and installs
 * a centralized error handler that understands Sequelize errors.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize } from 'sequelize';

import env, { validateEnv } from './config/env.js';
import logger from './config/logger.js';
import { bootDatabase, testDatabaseConnection } from './config/database.js';

import healthRoutes from './routes/healthRoutes.js';
import aiDemoRoutes from './routes/aiDemoRoutes.js';
import { createApiRouter } from './routes/index.js';
import { ApiError } from './utils/ApiError.js';
import { AiProviderError } from './modules/ai/utils/aiErrors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// --- Security & observability middleware -------------------------------------
// crossOriginResourcePolicy: helmet's default ("same-origin") blocks the
// frontend (port 8080) from EMBEDDING /uploads images served here (port 3000).
// "cross-origin" keeps every other helmet protection and only relaxes CORP,
// which is correct for publicly-served catalog images.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
// Capture the RAW request body for payment webhook signature verification.
// `verify` runs before parsing; we stash the bytes on req.rawBody. The cost is
// negligible (one extra Buffer per JSON request) and keeps the webhook route
// able to verify the exact bytes the gateway signed. Type 'application/json' is
// still parsed into req.body as usual.
//
// `limit: '256kb'` protects every JSON endpoint from oversized payloads (e.g.
// an absurdly large AI search query). File uploads do NOT go through this —
// they are handled by the Multer middleware separately. 256kb is generous for
// all legitimate JSON in this API; anything bigger is almost certainly abuse.
app.use(
  express.json({
    limit: '256kb',
    verify: (req, _res, buf) => {
      // Only retain for webhook paths to avoid holding bodies elsewhere.
      if (req.originalUrl && req.originalUrl.includes('/webhooks/payments')) {
        req.rawBody = buf;
      }
    },
  }),
);
app.use(
  morgan(env.isProd ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }),
);

// --- Info + meta routes ------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    name: 'Subh Backend',
    architecture: 'Modular Monolith',
    version: '0.3.0',
    endpoints: '/api/health, /api/ai-status, /api/{resource}',
    docs: 'See README.md for the full endpoint list.',
  });
});

app.use('/api', healthRoutes);
app.use('/api', aiDemoRoutes);

// Static serving of uploaded product images. Mounted BEFORE the API router
// so /uploads/* is always matched. Files are written by src/middleware/upload.js
// (Multer) under <project-root>/uploads/products/ (two levels up from src/),
// and served here at /uploads/products/<file>.
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '..', 'uploads'), {
    maxAge: '7d',
    fallthrough: true,
  }),
);

// The CRUD API router + 404 + error handler are mounted inside bootApp(),
// AFTER the API router, so request matching happens in the right order.

/**
 * Boot the application: validate env, connect DB, register models, and mount
 * the CRUD API router. Called by server.js before listen().
 */
export async function bootApp() {
  validateEnv();
  logger.info(`Validating environment ... dialect=${env.db.dialect}`);

  const { models } = await bootDatabase();
  app.locals.models = models; // available, but prefer factory injection
  logger.info(`Database connection established. ${Object.keys(models).length} models registered.`);

  // Mount all CRUD routes now that models are available.
  app.use('/api', createApiRouter({ models }));

  // --- 404 (must come AFTER the API router) --------------------------------
  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'Not Found' });
  });

  // --- Centralized error handler -------------------------------------------
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    logger.error(err);

    // AI provider failures carry a machine-readable `code` (timeout /
    // rate_limited / provider_error / parse_error / empty_response /
    // truncated_response / not_configured). Surface it so clients can react,
    // but keep the body free of keys or raw provider payloads.
    // NOTE: this MUST come before the generic ApiError branch — AiProviderError
    // extends ApiError, so the ApiError check would otherwise swallow it.
    if (err instanceof AiProviderError) {
      // On rate-limit (429), forward the provider's guidance to the client via
      // the standard Retry-After header (in seconds) so well-behaved clients
      // back off instead of hammering the endpoint.
      if (err.code === 'rate_limited') {
        const retryAfterMs = err.details?.retry_after_ms;
        if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
          res.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
        }
      }
      return res.status(err.status).json({
        ok: false,
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }
    if (err instanceof ApiError) {
      return res.status(err.status).json({ ok: false, error: err.message, details: err.details });
    }
    // Multer errors (file too large, too many files, unexpected field, …) →
    // surface as a clean 413/400 with a code so the client can react.
    if (err.name === 'MulterError') {
      let status = 400;
      let message = err.message || 'خطأ في رفع الملف';
      if (err.code === 'LIMIT_FILE_SIZE') {
        status = 413;
        message = 'حجم الملف يتجاوز الحد المسموح (5 ميجابايت)';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        status = 400;
        message = 'اسم حقل الملف غير صحيح، المتوقع: image';
      }
      return res.status(status).json({ ok: false, error: message, code: err.code });
    }
    if (err instanceof Sequelize.UniqueConstraintError) {
      return res.status(409).json({
        ok: false,
        error: 'Resource already exists',
        details: err.errors.map((e) => ({ field: e.path, message: e.message })),
      });
    }
    if (err instanceof Sequelize.ValidationError) {
      return res.status(422).json({
        ok: false,
        error: 'Validation failed',
        details: err.errors.map((e) => ({ field: e.path, message: e.message })),
      });
    }
    if (err instanceof Sequelize.ForeignKeyConstraintError) {
      return res.status(400).json({
        ok: false,
        error: 'Referenced resource does not exist',
        details: err.fields,
      });
    }
    // Express body-parser: payload exceeded the configured `limit` (256kb).
    // `status` is already 413; surface a clean code + message instead of the
    // raw parser text.
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        ok: false,
        error: 'حجم الطلب كبير جدًا',
        code: 'payload_too_large',
      });
    }
    // Malformed JSON body → 400, not a generic 500.
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        ok: false,
        error: 'صيغة الطلب غير صالحة (JSON غير صحيح)',
        code: 'invalid_json',
      });
    }
    return res.status(err.status || 500).json({
      ok: false,
      error: env.isProd ? 'Internal Server Error' : err.message,
    });
  });

  return { app, models };
}

export { testDatabaseConnection };
export default app;
