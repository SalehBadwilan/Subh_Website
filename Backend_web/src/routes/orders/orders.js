import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createOrderRoutes({ models }) {
  const router = Router();
  const { Order } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.user_id) where.user_id = req.query.user_id;
    if (req.query.merchant_id) where.merchant_id = req.query.merchant_id;
    if (req.query.status) where.status = req.query.status;
    const { rows, count } = await Order.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: models.OrderItem, as: 'OrderItems', required: false },
        { model: models.OrderStatusHistory, as: 'OrderStatusHistories', required: false },
      ],
    });
    if (!order) throw notFound('Order');
    res.json({ ok: true, data: order });
  }));

  router.post('/', [
    body('user_id').isUUID(),
    body('merchant_id').isUUID(),
    body('shipping_address_id').isUUID(),
    body('subtotal_sar').isFloat({ min: 0 }),
    body('total_sar').isFloat({ min: 0 }),
    body('discount_sar').optional().isFloat({ min: 0 }),
    body('shipping_sar').optional().isFloat({ min: 0 }),
    body('vat_sar').optional().isFloat({ min: 0 }),
    body('parent_order_id').optional({ nullable: true }).isUUID(),
  ], validate, asyncHandler(async (req, res) => {
    // Generate a human-friendly number server-side (not user-controlled).
    const number = `ORD-${Date.now()}`;
    const order = await Order.create({ ...req.body, number, status: 'pending_payment' });
    res.status(201).json({ ok: true, data: order });
  }));

  return router;
}
