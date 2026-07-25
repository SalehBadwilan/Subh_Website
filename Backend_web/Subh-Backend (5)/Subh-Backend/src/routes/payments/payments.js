import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';

// Payments are financial records: READ only via REST. Status transitions are
// driven by gateway webhooks (to be implemented later).
export default function createPaymentRoutes({ models }) {
  const router = Router();
  const { Payment } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.order_id) where.order_id = req.query.order_id;
    if (req.query.status) where.status = req.query.status;
    const { rows, count } = await Payment.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const p = await Payment.findByPk(req.params.id, {
      include: [{ model: models.PaymentEvent, as: 'PaymentEvents', required: false }],
    });
    if (!p) throw notFound('Payment');
    res.json({ ok: true, data: p });
  }));

  return router;
}
