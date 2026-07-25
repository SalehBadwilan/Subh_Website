import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createRefundRoutes({ models }) {
  const router = Router();
  const { Refund } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.payment_id) where.payment_id = req.query.payment_id;
    if (req.query.order_id) where.order_id = req.query.order_id;
    const { rows, count } = await Refund.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const r = await Refund.findByPk(req.params.id);
    if (!r) throw notFound('Refund');
    res.json({ ok: true, data: r });
  }));

  router.post('/', [
    body('payment_id').isUUID(),
    body('order_id').isUUID(),
    body('amount_sar').isFloat({ min: 0 }),
    body('reason_ar').optional().isString(),
  ], validate, asyncHandler(async (req, res) => {
    const r = await Refund.create({ ...req.body, status: 'pending' });
    res.status(201).json({ ok: true, data: r });
  }));

  return router;
}
