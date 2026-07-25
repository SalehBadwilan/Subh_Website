import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';

// READ only — invoices are generated from orders.
export default function createInvoiceRoutes({ models }) {
  const router = Router();
  const { Invoice } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.order_id) where.order_id = req.query.order_id;
    const { rows, count } = await Invoice.findAndCountAll({ where, limit, offset, order: [['issued_at', 'DESC']] });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const i = await Invoice.findByPk(req.params.id);
    if (!i) throw notFound('Invoice');
    res.json({ ok: true, data: i });
  }));

  return router;
}
