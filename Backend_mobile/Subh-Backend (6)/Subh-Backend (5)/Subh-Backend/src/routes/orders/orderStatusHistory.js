import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';

// Append-only: READ only.
export default function createOrderStatusHistoryRoutes({ models }) {
  const router = Router();
  const { OrderStatusHistory } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.order_id) where.order_id = req.query.order_id;
    const { rows, count } = await OrderStatusHistory.findAndCountAll({
      where, limit, offset, order: [['created_at', 'ASC']],
    });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const h = await OrderStatusHistory.findByPk(req.params.id);
    if (!h) throw notFound('OrderStatusHistory');
    res.json({ ok: true, data: h });
  }));

  return router;
}
