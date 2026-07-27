/**
 * Merchants (Admin) — Stage 3.
 *
 *   GET /api/admin/merchants         paginated + filterable list
 *   GET /api/admin/merchants/:id     single merchant (with user + product count)
 *
 * Read-only at this router. Merchant creation happens via the application
 * approval flow (POST /api/admin/merchant-applications/:id/approve). Mutations
 * (status change, commission) are handled through the existing generic CRUD
 * router at /api/merchants — they are intentionally NOT re-exposed here to
 * avoid duplicate paths.
 */
import { Router } from 'express';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import { serializeMerchant } from '../utils/serializers.js';

export default function createAdminMerchantRoutes({ models }) {
  const router = Router();
  const { Merchant, User, MerchantProduct } = models;

  // --- GET /api/admin/merchants --------------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.q) {
        const q = String(req.query.q).trim();
        where[Op.or] = [
          { commercial_name: { [Op.iLike]: `%${q}%` } },
          { commercial_registration_no: { [Op.iLike]: `%${q}%` } },
          { vat_number: { [Op.iLike]: `%${q}%` } },
        ];
      }

      // Sorting: defaults to created_at DESC; supports ?sort=name|created_at|rating.
      const sortMap = {
        name: ['commercial_name', 'ASC'],
        created_at: ['created_at', 'DESC'],
        rating: ['rating_avg', 'DESC'],
      };
      const sort = sortMap[req.query.sort] || ['created_at', 'DESC'];
      const direction = req.query.direction === 'asc' ? 'ASC' : sort[1];

      const { rows, count } = await Merchant.findAndCountAll({
        where,
        include: [
          { model: User, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] },
        ],
        limit,
        offset,
        order: [[sort[0], direction]],
        distinct: true,
      });

      res.json(paginatedResponse(rows.map((m) => serializeMerchant(m)), count, { page, limit }));
    }),
  );

  // --- GET /api/admin/merchants/:id ----------------------------------------
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const merchant = await Merchant.findByPk(req.params.id, {
        include: [{ model: User, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] }],
      });
      if (!merchant) throw notFound('Merchant');

      const productCount = await MerchantProduct.count({
        where: { merchant_id: merchant.id },
      });

      const data = serializeMerchant(merchant);
      data.user = merchant.User
        ? {
            id: merchant.User.id,
            full_name: merchant.User.full_name,
            phone: merchant.User.phone,
            email: merchant.User.email,
            is_active: merchant.User.is_active,
          }
        : null;
      data.assigned_products_count = productCount;

      res.json({ ok: true, data });
    }),
  );

  return router;
}
