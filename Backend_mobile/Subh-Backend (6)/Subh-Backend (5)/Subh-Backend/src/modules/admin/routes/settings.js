/**
 * Settings (Admin) — Stage 3.
 *
 *   GET /api/admin/settings
 *   PUT /api/admin/settings
 *
 * Settings use a key/value table (settings) with JSONB values, matching the
 * project's design language (timestamps + underscored naming). This keeps the
 * surface minimal while supporting arbitrary scalar/structured values.
 *
 * GET  — returns every setting row grouped by `group` for easy rendering. No
 *        secrets ever live here (AI keys, JWT secret etc. come from env only).
 *
 * PUT  — accepts a partial { key: value } mapping. Existing keys are updated;
 *        new keys are created with a default label_ar. Each write is an upsert,
 *        so the admin can add a brand-new flag without a separate endpoint.
 *
 * Both operations require Admin role (full) for PUT; GET is read-only and open
 * to Admin Employee.
 */
import { Router } from 'express';
import { body } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { badRequest } from '../../../utils/ApiError.js';
import validate from '../../../middleware/validate.js';
import { requireFullAdmin } from '../../../middleware/adminAuth.js';
import { serializeSetting } from '../utils/serializers.js';

export default function createAdminSettingRoutes({ models }) {
  const router = Router();
  const { Setting } = models;

  // --- GET /api/admin/settings ---------------------------------------------
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const rows = await Setting.findAll({
        order: [['group', 'ASC'], ['key', 'ASC']],
      });

      // Group by `group` for an admin-friendly structure.
      const grouped = {};
      const flat = [];
      for (const s of rows) {
        const serialized = serializeSetting(s);
        flat.push(serialized);
        const g = s.group || 'general';
        if (!grouped[g]) grouped[g] = {};
        grouped[g][s.key] = s.value;
      }

      res.json({ ok: true, data: { grouped, items: flat } });
    }),
  );

  // --- PUT /api/admin/settings ---------------------------------------------
  // Body: object mapping setting key → value (any JSON-serializable value).
  router.put(
    '/',
    requireFullAdmin,
    [
      body('*')
        .custom((value, { req }) => {
          // Must be a plain object of string-key → JSON values.
          if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            throw new Error('Body must be a JSON object of { key: value }');
          }
          return true;
        }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const entries = Object.entries(req.body);
      if (!entries.length) throw badRequest('لا توجد قيم للتحديث');

      const updated = [];
      for (const [key, value] of entries) {
        if (typeof key !== 'string' || !key.trim()) continue;

        const [row, created] = await Setting.findOrCreate({
          where: { key },
          defaults: {
            key,
            label_ar: key, // default to the key; admin can refine later.
            value,
            group: 'general',
          },
        });
        if (!created) {
          // Update value (and optionally label/group if provided).
          const patch = { value };
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Allow optional label_ar / group overrides inside the value object
            // for convenience; they are stripped before persistence.
            if (typeof value._label_ar === 'string') patch.label_ar = value._label_ar;
            if (typeof value._group === 'string') patch.group = value._group;
            if (value._label_ar !== undefined || value._group !== undefined) {
              // Strip control keys from the persisted payload.
              patch.value = { ...value };
              delete patch.value._label_ar;
              delete patch.value._group;
            }
          }
          await row.update(patch);
        }
        updated.push(row);
      }

      res.json({
        ok: true,
        message: 'تم تحديث الإعدادات',
        data: { updated: updated.map((s) => serializeSetting(s)) },
      });
    }),
  );

  return router;
}
