import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import { authenticate } from "../../middleware/auth.js";
import { requireAdmin, requireFullAdmin } from "../../middleware/adminAuth.js";

export default function createPermissionRoutes({ models }) {
  const router = Router();
const { Permission } = models;

router.use(authenticate());
router.use(requireAdmin);

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Permission.findAndCountAll({ limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const p = await Permission.findByPk(req.params.id);
    if (!p) throw notFound('Permission');
    res.json({ ok: true, data: p });
  }));

  router.post(
  '/',
  requireFullAdmin,
  [
    body('slug').isString().isLength({ min: 1, max: 100 }),
    body('name_ar').isString().isLength({ min: 1, max: 100 }),
  ], validate, asyncHandler(async (req, res) => {
    const p = await Permission.create(req.body);
    res.status(201).json({ ok: true, data: p });
  }));

  router.put(
  '/:id',
  requireFullAdmin,
  [
    body('slug').optional().isString().isLength({ min: 1, max: 100 }),
    body('name_ar').optional().isString().isLength({ min: 1, max: 100 }),
  ], validate, asyncHandler(async (req, res) => {
    const p = await Permission.findByPk(req.params.id);
    if (!p) throw notFound('Permission');
    await p.update(req.body);
    res.json({ ok: true, data: p });
  }));

  router.delete(
  '/:id',
  requireFullAdmin, asyncHandler(async (req, res) => {
    const deleted = await Permission.destroy({ where: { id: req.params.id } });
    if (!deleted) throw notFound('Permission');
    res.json({ ok: true, message: 'Permission deleted' });
  }));

  return router;
}
