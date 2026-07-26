import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createStockReservationRoutes({ models }) {
  const router = Router();
  const { StockReservation } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.inventory_id) where.inventory_id = req.query.inventory_id;
    if (req.query.status) where.status = req.query.status;
    const { rows, count } = await StockReservation.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const r = await StockReservation.findByPk(req.params.id);
    if (!r) throw notFound('StockReservation');
    res.json({ ok: true, data: r });
  }));

  router.post('/', [
    body('inventory_id').isUUID(),
    body('quantity').isInt({ min: 1 }),
    body('expires_at').isISO8601(),
    body('cart_id').optional({ nullable: true }).isUUID(),
    body('order_id').optional({ nullable: true }).isUUID(),
  ], validate, asyncHandler(async (req, res) => {
    const r = await StockReservation.create({ ...req.body, status: 'active' });
    res.status(201).json({ ok: true, data: r });
  }));

  // DELETE = release the reservation (mark released).
  router.delete('/:id', asyncHandler(async (req, res) => {
    const r = await StockReservation.findByPk(req.params.id);
    if (!r) throw notFound('StockReservation');
    await r.update({ status: 'released' });
    res.json({ ok: true, message: 'StockReservation released' });
  }));

  return router;
}
