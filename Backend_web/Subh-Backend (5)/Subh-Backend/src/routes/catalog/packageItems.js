import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import validate from '../../middleware/validate.js';

export default function createPackageItemRoutes({ models }) {
  const router = Router();
  const { PackageItem } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.package_id) where.package_id = req.query.package_id;
    if (req.query.product_id) where.product_id = req.query.product_id;
    const rows = await PackageItem.findAll({ where });
    res.json({ ok: true, data: rows });
  }));

  // Composite PK: look up by both keys
  router.get('/:package_id/:product_id', asyncHandler(async (req, res) => {
    const item = await PackageItem.findByPk({
      package_id: req.params.package_id,
      product_id: req.params.product_id,
    });
    if (!item) throw notFound('PackageItem');
    res.json({ ok: true, data: item });
  }));

  router.post(
    '/',
    [
      body('package_id').isUUID(),
      body('product_id').isUUID(),
      body('quantity').optional().isInt({ min: 1 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const item = await PackageItem.create(req.body);
      res.status(201).json({ ok: true, data: item });
    }),
  );

  router.put(
    '/:package_id/:product_id',
    [body('quantity').optional().isInt({ min: 1 })],
    validate,
    asyncHandler(async (req, res) => {
      const item = await PackageItem.findByPk({
        package_id: req.params.package_id,
        product_id: req.params.product_id,
      });
      if (!item) throw notFound('PackageItem');
      await item.update(req.body);
      res.json({ ok: true, data: item });
    }),
  );

  router.delete('/:package_id/:product_id', asyncHandler(async (req, res) => {
    const deleted = await PackageItem.destroy({
      where: { package_id: req.params.package_id, product_id: req.params.product_id },
    });
    if (!deleted) throw notFound('PackageItem');
    res.json({ ok: true, message: 'PackageItem deleted' });
  }));

  return router;
}
