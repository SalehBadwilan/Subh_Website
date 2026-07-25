/**
 * Users (Admin) — Stage 3.
 *
 *   GET    /api/admin/users
 *   PATCH  /api/admin/users/:id/toggle-active
 *
 * User creation is handled by the OTP flow (or by seeders). This router is
 * intentionally limited to listing + activation/deactivation:
 *   - Listing always excludes password_hash (belt-and-braces with the model).
 *   - toggle-active flips is_active. Inactive users cannot log in (the OTP
 *     verify flow blocks them), which is the safe way to "disable" an account
 *     without deleting it. We do NOT cascade because:
 *       (a) it would destroy merchant/order history;
 *       (b) the OTP login already enforces is_active=false → 403.
 *
 * Deactivating a user does not, by design, auto-deactivate their merchant. If
 * tighter coordination is needed it is performed through the merchant status
 * endpoints. This avoids silent cross-entity side effects.
 */
import { Router } from 'express';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import { requireFullAdmin } from '../../../middleware/adminAuth.js';
import { serializeUser } from '../utils/serializers.js';

export default function createAdminUserRoutes({ models }) {
  const router = Router();
  const { User } = models;

  // --- GET /api/admin/users ------------------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.is_active != null) where.is_active = req.query.is_active === 'true';
      if (req.query.is_guest != null) where.is_guest = req.query.is_guest === 'true';
      if (req.query.q) {
        const q = String(req.query.q).trim();
        where[Op.or] = [
          { full_name: { [Op.iLike]: `%${q}%` } },
          { phone: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } },
        ];
      }

      const { rows, count } = await User.findAndCountAll({
        where,
        limit,
        offset,
        attributes: { exclude: ['password_hash'] },
        order: [['created_at', 'DESC']],
      });
      res.json(paginatedResponse(rows.map((u) => serializeUser(u)), count, { page, limit }));
    }),
  );

  // --- PATCH /api/admin/users/:id/toggle-active ---------------------------
  router.patch(
    '/:id/toggle-active',
    requireFullAdmin,
    asyncHandler(async (req, res) => {
      const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ['password_hash'] },
      });
      if (!user) throw notFound('User');

      await user.update({ is_active: !user.is_active });
      res.json({ ok: true, data: { id: user.id, is_active: user.is_active } });
    }),
  );

  return router;
}
