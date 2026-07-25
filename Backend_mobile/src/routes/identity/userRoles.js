import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import { authenticate } from "../../middleware/auth.js";
import { requireAdmin, requireFullAdmin } from "../../middleware/adminAuth.js";

export default function createUserRoleRoutes({ models }) {
  const router = Router();
  const { UserRole } = models;
  

router.use(authenticate());
router.use(requireAdmin);

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.user_id) where.user_id = req.query.user_id;
    if (req.query.role_id) where.role_id = req.query.role_id;
    const { rows, count } = await UserRole.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const ur = await UserRole.findByPk(req.params.id);
    if (!ur) throw notFound('UserRole');
    res.json({ ok: true, data: ur });
  }));

  router.post(
  '/',
  requireFullAdmin, [
    body('user_id').isUUID(),
    body('role_id').isUUID(),
    body('merchant_id').optional({ nullable: true }).isUUID(),
  ], validate, asyncHandler(async (req, res) => {
    const ur = await UserRole.create(req.body);
    res.status(201).json({ ok: true, data: ur });
  }));

  router.delete(
  '/:id',
  requireFullAdmin, asyncHandler(async (req, res) => {
    const deleted = await UserRole.destroy({ where: { id: req.params.id } });
    if (!deleted) throw notFound('UserRole');
    res.json({ ok: true, message: 'UserRole deleted' });
  }));

  return router;
}
