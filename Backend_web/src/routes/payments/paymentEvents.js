import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';

// Append-only gateway event log: READ only.
export default function createPaymentEventRoutes({ models }) {
  const router = Router();
  const { PaymentEvent } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.payment_id) where.payment_id = req.query.payment_id;
    const { rows, count } = await PaymentEvent.findAndCountAll({ where, limit, offset, order: [['received_at', 'DESC']] });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const e = await PaymentEvent.findByPk(req.params.id);
    if (!e) throw notFound('PaymentEvent');
    res.json({ ok: true, data: e });
  }));

  return router;
}
