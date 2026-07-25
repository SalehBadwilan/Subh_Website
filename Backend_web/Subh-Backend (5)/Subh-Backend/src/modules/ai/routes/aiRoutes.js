/**
 * AI module routes.
 *
 *   POST /api/ai/product-search
 *     Body: { query: string, page?: number, limit?: number }
 *     Returns active products whose catalog fields match the semantic intent
 *     extracted from `query` by OpenAI.
 *
 * Mirrors the createXxxRoutes({ models }) factory pattern used by every CRUD
 * module, so models are injected (no global singletons) and the centralized
 * error handler + express-validator pipeline apply as usual.
 */
import { Router } from 'express';
import { body } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import validate from '../../../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import env from '../../../config/env.js';
import { aiNotConfigured } from '../utils/aiErrors.js';
import { analyzeSearchIntent, searchProducts } from '../services/aiService.js';

export default function createAiRoutes({ models }) {
  const router = Router();
  const { Product, Category } = models;

  // --- POST /api/ai/product-search -----------------------------------------
  router.post(
    '/product-search',
    [
      body('query')
        .exists({ checkFalsy: true })
        .withMessage('query مطلوب')
        .isString()
        .withMessage('query يجب أن يكون نصًا')
        .isLength({ min: 1, max: 500 })
        .withMessage('query يجب أن يكون بين 1 و500 حرف'),
      body('page').optional().isInt({ min: 1 }).withMessage('page يجب أن يكون عددًا موجبًا'),
      body('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit يجب أن يكون بين 1 و100'),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { query } = req.body;

      // Graceful degradation: if AI isn't configured, fail with a clear 503
      // instead of attempting a call we know will fail.
      if (!env.aiApiKeyConfigured) throw aiNotConfigured();

      const pagination = parsePagination(req.query);

      // Step 1: semantic understanding of the free-text query → structured intent.
      const intent = await analyzeSearchIntent({ query });

      // Step 2: run the intent as a normal, indexed catalog query.
      const { rows, count } = await searchProducts({
        Product,
        Category,
        intent,
        pagination,
      });

      const envelope = paginatedResponse(rows, count, pagination);

      // Return a SAFE summary of the intent, not the raw intent object — the
      // raw keywords/price bounds are internal; exposing them leaks model
      // behavior and offers no value to the client. Counts + flags are enough.
      const intentSummary = {
        keywords_count: (intent.keywords || []).length,
        has_price_filter: intent.price_min != null || intent.price_max != null,
        has_category_filter: Boolean(intent.category_slug),
      };

      return res.status(200).json({
        ok: true,
        data: {
          // Safe summary only (see comment above).
          intent: intentSummary,
          // Products + pagination keep the same envelope shape used across the
          // API, just nested one level deeper under `data`.
          products: rows,
          pagination: envelope.pagination,
        },
      });
    }),
  );

  return router;
}
