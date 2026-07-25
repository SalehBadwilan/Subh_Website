import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound, badRequest } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createCartItemRoutes({ models }) {
  const router = Router();
  const { CartItem } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.cart_id) where.cart_id = req.query.cart_id;
    const { rows, count } = await CartItem.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const item = await CartItem.findByPk(req.params.id);
    if (!item) throw notFound('CartItem');
    res.json({ ok: true, data: item });
  }));

  router.post('/', [
    body('cart_id').isUUID(),
    body('merchant_id').isUUID(),
    body('quantity').isInt({ min: 1 }),
    body('unit_price_sar').isFloat({ min: 0 }),
    body('product_id').optional({ nullable: true }).isUUID(),
    body('package_id').optional({ nullable: true }).isUUID(),
  ], validate, asyncHandler(async (req, res) => {
    const { product_id, package_id } = req.body;
    if ((product_id == null) === (package_id == null)) {
      throw badRequest('Provide exactly one of product_id or package_id');
    }
    const item = await CartItem.create(req.body);
    res.status(201).json({ ok: true, data: item });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const deleted = await CartItem.destroy({ where: { id: req.params.id } });
    if (!deleted) throw notFound('CartItem');
    res.json({ ok: true, message: 'CartItem removed' });
  }));

  return router;
}
