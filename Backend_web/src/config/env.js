/**
 * Centralized environment configuration.
 *
 * This is the SINGLE place in the codebase that reads process.env.
 * Every other module imports from here, so we get one controlled choke
 * point for validation and for keeping secrets (like AI_API_KEY) out of
 * logs and out of responses.
 */
import dotenv from 'dotenv';

// Load variables from .env into process.env (if a .env file exists).
dotenv.config();

const required = (name) => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

const optionalInt = (name, fallback) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  port: optionalInt('PORT', 3000),

  // --- Database ------------------------------------------------------------
  // Default to SQLite so the project runs locally with zero infra setup.
  // Switch to postgres later by setting DB_DIALECT=postgres in .env.
  db: {
    // PostgreSQL is the canonical DB for Subh. SQLite is supported only as a
    // fallback for environments where Postgres cannot be installed.
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: optionalInt('DB_PORT', 5432),
    name: process.env.DB_NAME || 'subh_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    // SSL toggle ("true"/"1"/"yes"). Supabase rejects unencrypted connections.
    ssl: ['true', '1', 'yes'].includes((process.env.DB_SSL || '').toLowerCase()),
    // SQLite-only: where to store the file.
    storage: process.env.DB_STORAGE || './data/subh.sqlite',
  },

  // --- AI integration ------------------------------------------------------
  // Read ONLY from the environment. Never written to disk, never echoed back
  // in any response. We expose a boolean for status checks and the key itself
  // stays private behind a function boundary.
  aiApiKey: process.env.AI_API_KEY || '',
  aiApiKeyConfigured: Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.trim() !== ''),
  // Provider label. The client speaks the OpenAI Chat Completions schema, so
  // any OpenAI-compatible endpoint works. 'gemini' uses Google's OpenAI-compat
  // shim via AI_BASE_URL below.
  aiProvider: process.env.AI_PROVIDER || 'openai',
  // Base URL of the OpenAI-compatible Chat Completions endpoint WITHOUT the
  // trailing '/chat/completions' path — the client appends that. Any trailing
  // slashes are stripped so AI_BASE_URL works with or without them.
  //   OpenAI (default): https://api.openai.com/v1
  //   Gemini OpenAI-compat: https://generativelanguage.googleapis.com/v1beta/openai
  aiBaseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
  // Model used for semantic analysis (intent extraction).
  //   OpenAI: gpt-4o-mini  |  Gemini Free Tier: gemini-2.5-flash
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  // Hard timeout (ms) for a single OpenAI call. AbortController enforces it so
  // a slow/hung provider never blocks a request worker indefinitely.
  aiTimeoutMs: Math.min(Math.max(optionalInt('AI_TIMEOUT_MS', 15000), 1000), 60000),
  // Max completion tokens for the analysis call. Kept small — we only need a
  // tiny JSON object back, not free-form text.
  aiMaxTokens: Math.min(Math.max(optionalInt('AI_MAX_TOKENS', 512), 64), 4096),
  // Max RETRIES on transient failures (429 rate limit, 5xx, network, timeout).
  // Total attempts = aiMaxRetries + 1. Clamped to [0, 4]. Permanent errors
  // (4xx like 401/403/400) are NEVER retried regardless of this value.
  aiMaxRetries: Math.min(Math.max(optionalInt('AI_MAX_RETRIES', 2), 0), 4),
  // Base delay (ms) for exponential backoff between retries. The actual delay
  // per attempt is base * 2^attempt (+ jitter), capped, and overridden by the
  // provider's Retry-After header when present.
  aiBaseRetryDelayMs: Math.min(Math.max(optionalInt('AI_BASE_RETRY_DELAY_MS', 500), 100), 5000),

  // --- Auth (JWT) ----------------------------------------------------------
  // Secret used to sign auth tokens. Falls back to a dev-only value so the
  // server still boots locally; production MUST set JWT_SECRET explicitly.
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // --- Payments ------------------------------------------------------------
  // Provider abstraction: 'test' (default) simulates the full payment flow
  // locally with NO external keys, so checkout works end-to-end in dev.
  // 'moyasar' is enabled automatically when MOYASAR_SECRET_KEY is set.
  payment: {
    provider: (process.env.PAYMENT_PROVIDER || 'test').toLowerCase(),
    // Public base URL the frontend uses to return after the gateway redirect.
    callbackUrl: process.env.PAYMENT_CALLBACK_URL || 'http://localhost:5173/customer/orders',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
    // Moyasar (https://moyasar.com) — Saudi gateway (mada, Apple Pay, STC Pay).
    moyasar: {
      secretKey: process.env.MOYASAR_SECRET_KEY || '',
      publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY || '',
      apiBaseUrl: process.env.MOYASAR_API_BASE_URL || 'https://api.moyasar.com/v1',
    },
  },
};

/**
 * Validate at boot. We fail fast so the server never starts in a half-broken
 * config (e.g. wrong DB dialect). AI_API_KEY is intentionally NOT required at
 * boot — the AI feature is optional and degrades gracefully.
 */
export function validateEnv() {
  const errors = [];

  const supportedDialects = ['sqlite', 'postgres', 'mysql'];
  if (!supportedDialects.includes(env.db.dialect)) {
    errors.push(
      `DB_DIALECT "${env.db.dialect}" is not supported. Use one of: ${supportedDialects.join(', ')}`,
    );
  }

  if (env.db.dialect !== 'sqlite') {
    if (!env.db.name) errors.push('DB_NAME is required when DB_DIALECT is not sqlite');
    if (!env.db.user) errors.push('DB_USER is required when DB_DIALECT is not sqlite');
  }

  if (errors.length) {
    throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  return env;
}

/**
 * Resolve the EFFECTIVE payment provider:
 *  - If PAYMENT_PROVIDER is explicitly 'moyasar' → use moyasar.
 *  - Else if a MOYASAR_SECRET_KEY is present → use moyasar (auto-detect).
 *  - Otherwise fall back to 'test' (full simulated flow, no external keys).
 *
 * This lets checkout work out-of-the-box in dev while real Moyasar keys can be
 * dropped in later without code changes.
 */
export function effectivePaymentProvider() {
  if (env.payment.provider === 'moyasar') return 'moyasar';
  if (env.payment.moyasar.secretKey) return 'moyasar';
  return 'test';
}

export default env;
