/**
 * AI status route — DEMO ONLY.
 *
 * Purpose: prove that AI_API_KEY is loaded from the environment and reachable
 * by the application. It does NOT call any AI provider and implements no AI
 * feature. A full AI module is a later deliverable.
 *
 * Security: we never return the key itself. Only a masked preview + booleans.
 */
import { Router } from 'express';
import env from '../config/env.js';

const router = Router();

function maskKey(key) {
  if (!key) return null;
  if (key.length <= 8) return '*'.repeat(key.length);
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/**
 * GET /api/ai-status
 * Confirms whether the AI key is configured, without exposing it.
 */
router.get('/ai-status', (_req, res) => {
  res.json({
    ok: true,
    configured: env.aiApiKeyConfigured,
    provider: env.aiProvider,
    keyPreview: maskKey(env.aiApiKey), // masked, never the raw key
    note: 'AI key is read from the environment only. No AI feature is executed by this endpoint.',
  });
});

export default router;
