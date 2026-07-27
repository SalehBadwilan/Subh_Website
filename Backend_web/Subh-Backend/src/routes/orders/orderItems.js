import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createOrderItemRoutes({ models }) {
  const router = Router();
  const { OrderItem } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.order_id) where.order_id = req.query.order_id;
    if (req.query.merchant_id) where.merchant_id = req.query.merchant_id;
    const { rows, count } = await OrderItem.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const item = await OrderItem.findByPk(req.params.id);
    if (!item) throw notFound('OrderItem');
    res.json({ ok: true, data: item });
  }));

  router.post('/', [
    body('order_id').isUUID(),
    body('merchant_id').isUUID(),
    body('name_snapshot_ar').isString().isLength({ min: 1, max: 200 }),
    body('sku_snapshot').isString().isLength({ min: 1, max: 50 }),
    body('quantity').isInt({ min: 1 }),
    body('unit_price_sar').isFloat({ min: 0 }),
    body('line_total_sar').isFloat({ min: 0 }),
    body('product_id').optional({ nullable: true }).isUUID(),
    body('package_id').optional({ nullable: true }).isUUID(),
  ], validate, asyncHandler(async (req, res) => {
    const item = await OrderItem.create(req.body);
    res.status(201).json({ ok: true, data: item });
  }));

  return router;
}
