import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createShipmentRoutes({ models }) {
  const router = Router();
  const { Shipment } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.order_id) where.order_id = req.query.order_id;
    if (req.query.status) where.status = req.query.status;
    const { rows, count } = await Shipment.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const s = await Shipment.findByPk(req.params.id);
    if (!s) throw notFound('Shipment');
    res.json({ ok: true, data: s });
  }));

  // Limited update — fulfilment status + tracking only.
  router.put('/:id', [
    body('status').optional().isIn(['pending', 'packed', 'handed_to_carrier', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned']),
    body('carrier').optional().isString(),
    body('tracking_number').optional().isString(),
  ], validate, asyncHandler(async (req, res) => {
    const s = await Shipment.findByPk(req.params.id);
    if (!s) throw notFound('Shipment');
    await s.update(req.body);
    res.json({ ok: true, data: s });
  }));

  return router;
}
