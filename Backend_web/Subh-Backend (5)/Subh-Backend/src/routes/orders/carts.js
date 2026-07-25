import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createCartRoutes({ models }) {
  const router = Router();
  const { Cart } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.user_id) where.user_id = req.query.user_id;
    if (req.query.status) where.status = req.query.status;
    const { rows, count } = await Cart.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const cart = await Cart.findByPk(req.params.id, {
      include: [{ model: models.CartItem, as: 'CartItems', required: false }],
    });
    if (!cart) throw notFound('Cart');
    res.json({ ok: true, data: cart });
  }));

  router.post('/', [
    body('user_id').optional({ nullable: true }).isUUID(),
    body('session_id').optional().isString(),
  ], validate, asyncHandler(async (req, res) => {
    const cart = await Cart.create(req.body);
    res.status(201).json({ ok: true, data: cart });
  }));

  return router;
}
