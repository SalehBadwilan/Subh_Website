import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createPackageRoutes({ models }) {
  const router = Router();
  const { Package } = models;

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      // Customer-safe default: only ACTIVE packages are shown unless an admin
      // explicitly requests a different status via ?status=. This keeps the
      // public catalog free of draft/archived bundles without breaking admin
      // tooling that filters by status.
      const where = { status: 'active' };
      if (req.query.status) where.status = req.query.status;
      const { rows, count } = await Package.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });
      res.json(paginatedResponse(rows, count, { page, limit }));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const pkg = await Package.findByPk(req.params.id);
      if (!pkg) throw notFound('Package');
      res.json({ ok: true, data: pkg });
    }),
  );

  router.post(
    '/',
    [
      body('sku').isString().isLength({ min: 1, max: 50 }).withMessage('sku required'),
      body('slug').isString().isLength({ min: 1, max: 150 }).withMessage('slug required'),
      body('name_ar').isString().isLength({ min: 1, max: 200 }).withMessage('name_ar required'),
      body('price_sar').isFloat({ min: 0 }).withMessage('price_sar must be >= 0'),
      body('description_ar').optional().isString(),
      body('vat_rate').optional().isFloat({ min: 0, max: 1 }),
      body('status').optional().isIn(['draft', 'active', 'archived']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const pkg = await Package.create(req.body);
      res.status(201).json({ ok: true, data: pkg });
    }),
  );

  router.put(
    '/:id',
    [
      body('sku').optional().isString().isLength({ min: 1, max: 50 }),
      body('slug').optional().isString().isLength({ min: 1, max: 150 }),
      body('name_ar').optional().isString().isLength({ min: 1, max: 200 }),
      body('price_sar').optional().isFloat({ min: 0 }),
      body('vat_rate').optional().isFloat({ min: 0, max: 1 }),
      body('status').optional().isIn(['draft', 'active', 'archived']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const pkg = await Package.findByPk(req.params.id);
      if (!pkg) throw notFound('Package');
      await pkg.update(req.body);
      res.json({ ok: true, data: pkg });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const pkg = await Package.findByPk(req.params.id);
      if (!pkg) throw notFound('Package');
      await pkg.destroy(); // soft delete
      res.json({ ok: true, message: 'Package deleted' });
    }),
  );

  return router;
}
