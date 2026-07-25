import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';

// Immutable ledger: READ only.
export default function createStockMovementRoutes({ models }) {
  const router = Router();
  const { StockMovement } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.inventory_id) where.inventory_id = req.query.inventory_id;
    if (req.query.type) where.type = req.query.type;
    const { rows, count } = await StockMovement.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const m = await StockMovement.findByPk(req.params.id);
    if (!m) throw notFound('StockMovement');
    res.json({ ok: true, data: m });
  }));

  return router;
}
