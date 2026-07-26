import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import { authenticate } from "../../middleware/auth.js";
import {
  requireFullAdmin,
} from "../../middleware/adminAuth.js";

export default function createPlanRoutes({ models }) {
  const router = Router();
  const { Plan } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.is_active) where.is_active = req.query.is_active === 'true';
    const { rows, count } = await Plan.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const p = await Plan.findByPk(req.params.id);
    if (!p) throw notFound('Plan');
    res.json({ ok: true, data: p });
  }));
  router.use(authenticate());
router.use(requireFullAdmin);

  router.post('/', [
    body('slug').isString().isLength({ min: 1, max: 50 }),
    body('name_ar').isString().isLength({ min: 1, max: 100 }),
    body('billing_period').isIn(['monthly', 'quarterly', 'yearly']),
    body('price_sar').isFloat({ min: 0 }),
    body('features').optional().isObject(),
  ], validate, asyncHandler(async (req, res) => {
    const p = await Plan.create(req.body);
    res.status(201).json({ ok: true, data: p });
  }));

  router.put('/:id', [
    body('name_ar').optional().isString().isLength({ min: 1, max: 100 }),
    body('price_sar').optional().isFloat({ min: 0 }),
    body('is_active').optional().isBoolean(),
    body('features').optional().isObject(),
  ], validate, asyncHandler(async (req, res) => {
    const p = await Plan.findByPk(req.params.id);
    if (!p) throw notFound('Plan');
    await p.update({
  name_ar: req.body.name_ar,
  price_sar: req.body.price_sar,
  is_active: req.body.is_active,
  features: req.body.features,
});
    res.json({ ok: true, data: p });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const deleted = await Plan.destroy({ where: { id: req.params.id } });
    if (!deleted) throw notFound('Plan');
    res.json({ ok: true, message: 'Plan deleted' });
  }));

  return router;
}
