/**
 * Packages (Admin) — Stage 3.
 *
 *   GET    /api/admin/packages
 *   POST   /api/admin/packages
 *   PUT    /api/admin/packages/:id
 *   PATCH  /api/admin/packages/:id/toggle-active
 *
 * `toggle-active` flips status between 'active' and 'archived' (drafts become
 * 'active' too). Mirrors the products toggle convention.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { requireFullAdmin } from '../../../middleware/adminAuth.js';
import { serializePackage } from '../utils/serializers.js';

export default function createAdminPackageRoutes({ models }) {
  const router = Router();
  const { Package } = models;

  // --- GET /api/admin/packages ---------------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.q) {
        const q = String(req.query.q).trim();
        where[Op.or] = [
          { name_ar: { [Op.iLike]: `%${q}%` } },
          { sku: { [Op.iLike]: `%${q}%` } },
          { slug: { [Op.iLike]: `%${q}%` } },
        ];
      }

      const { rows, count } = await Package.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });
      res.json(paginatedResponse(rows.map((p) => serializePackage(p)), count, { page, limit }));
    }),
  );

  // --- POST /api/admin/packages --------------------------------------------
  router.post(
    '/',
    requireFullAdmin,
    [
      body('sku').isString().isLength({ min: 1, max: 50 }).withMessage('sku required (1-50)'),
      body('slug').isString().isLength({ min: 1, max: 150 }).withMessage('slug required (1-150)'),
      body('name_ar').isString().isLength({ min: 1, max: 200 }).withMessage('name_ar required'),
      body('price_sar').isFloat({ min: 0 }).withMessage('price_sar must be >= 0'),
      body('description_ar').optional().isString(),
      body('vat_rate').optional().isFloat({ min: 0, max: 1 }),
      body('status').optional().isIn(['draft', 'active', 'archived']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const pkg = await Package.create({
  sku: req.body.sku,
  slug: req.body.slug,
  name_ar: req.body.name_ar,
  price_sar: req.body.price_sar,
  description_ar: req.body.description_ar,
  vat_rate: req.body.vat_rate,
  status: req.body.status,
});
      res.status(201).json({ ok: true, data: serializePackage(pkg) });
    }),
  );

  // --- PUT /api/admin/packages/:id -----------------------------------------
  router.put(
    '/:id',
    requireFullAdmin,
    [
      body('sku').optional().isString().isLength({ min: 1, max: 50 }),
      body('slug').optional().isString().isLength({ min: 1, max: 150 }),
      body('name_ar').optional().isString().isLength({ min: 1, max: 200 }),
      body('price_sar').optional().isFloat({ min: 0 }),
      body('description_ar').optional().isString(),
      body('vat_rate').optional().isFloat({ min: 0, max: 1 }),
      body('status').optional().isIn(['draft', 'active', 'archived']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const pkg = await Package.findByPk(req.params.id);
      if (!pkg) throw notFound('Package');
    await pkg.update({
  sku: req.body.sku,
  slug: req.body.slug,
  name_ar: req.body.name_ar,
  price_sar: req.body.price_sar,
  description_ar: req.body.description_ar,
  vat_rate: req.body.vat_rate,
  status: req.body.status,
});
      res.json({ ok: true, data: serializePackage(pkg) });
    }),
  );

  // --- PATCH /api/admin/packages/:id/toggle-active ------------------------
  router.patch(
    '/:id/toggle-active',
    requireFullAdmin,
    asyncHandler(async (req, res) => {
      const pkg = await Package.findByPk(req.params.id);
      if (!pkg) throw notFound('Package');

      const nextStatus = pkg.status === 'active' ? 'archived' : 'active';
      await pkg.update({ status: nextStatus });
      res.json({ ok: true, data: { id: pkg.id, status: pkg.status } });
    }),
  );

  return router;
}
