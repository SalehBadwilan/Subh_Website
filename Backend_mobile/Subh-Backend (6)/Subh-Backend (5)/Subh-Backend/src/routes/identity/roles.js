import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import { authenticate } from "../../middleware/auth.js";
import { requireAdmin, requireFullAdmin } from "../../middleware/adminAuth.js";

export default function createRoleRoutes({ models }) {
  const router = Router();
  const { Role } = models;
  router.use(authenticate());
router.use(requireAdmin);

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Role.findAndCountAll({ limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const role = await Role.findByPk(req.params.id);
    if (!role) throw notFound('Role');
    res.json({ ok: true, data: role });
  }));

  router.post(
  '/',
  requireFullAdmin, [
    body('slug').isString().isLength({ min: 1, max: 50 }),
    body('name_ar').isString().isLength({ min: 1, max: 100 }),
    body('scope').optional().isIn(['global', 'merchant']),
  ], validate, asyncHandler(async (req, res) => {
    const role = await Role.create(req.body);
    res.status(201).json({ ok: true, data: role });
  }));

 router.put(
  '/:id',
  requireFullAdmin, [
    body('slug').optional().isString().isLength({ min: 1, max: 50 }),
    body('name_ar').optional().isString().isLength({ min: 1, max: 100 }),
    body('scope').optional().isIn(['global', 'merchant']),
  ], validate, asyncHandler(async (req, res) => {
    const role = await Role.findByPk(req.params.id);
    if (!role) throw notFound('Role');
    await role.update(req.body);
    res.json({ ok: true, data: role });
  }));

  router.delete(
  '/:id',
  requireFullAdmin, asyncHandler(async (req, res) => {
    const deleted = await Role.destroy({ where: { id: req.params.id } });
    if (!deleted) throw notFound('Role');
    res.json({ ok: true, message: 'Role deleted' });
  }));

  return router;
}
