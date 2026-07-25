import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createAddressRoutes({ models }) {
  const router = Router();
  const { Address } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.user_id) where.user_id = req.query.user_id;
    const { rows, count } = await Address.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const a = await Address.findByPk(req.params.id);
    if (!a) throw notFound('Address');
    res.json({ ok: true, data: a });
  }));

  router.post('/', [
    body('user_id').isUUID(),
    body('recipient_name').isString().isLength({ min: 1, max: 150 }),
    body('phone').isString().isLength({ min: 5, max: 20 }),
    body('line1').isString().isLength({ min: 1, max: 255 }),
    body('city').isString().isLength({ min: 1, max: 100 }),
    body('region').isString().isLength({ min: 1, max: 100 }),
    body('line2').optional().isString(),
    body('postal_code').optional().isString(),
    body('is_default').optional().isBoolean(),
  ], validate, asyncHandler(async (req, res) => {
    const a = await Address.create(req.body);
    res.status(201).json({ ok: true, data: a });
  }));

  router.put('/:id', [
    body('recipient_name').optional().isString().isLength({ min: 1, max: 150 }),
    body('phone').optional().isString().isLength({ min: 5, max: 20 }),
    body('line1').optional().isString().isLength({ min: 1, max: 255 }),
    body('city').optional().isString().isLength({ min: 1, max: 100 }),
    body('region').optional().isString().isLength({ min: 1, max: 100 }),
    body('is_default').optional().isBoolean(),
  ], validate, asyncHandler(async (req, res) => {
    const a = await Address.findByPk(req.params.id);
    if (!a) throw notFound('Address');
    await a.update(req.body);
    res.json({ ok: true, data: a });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const deleted = await Address.destroy({ where: { id: req.params.id } });
    if (!deleted) throw notFound('Address');
    res.json({ ok: true, message: 'Address deleted' });
  }));

  return router;
}
