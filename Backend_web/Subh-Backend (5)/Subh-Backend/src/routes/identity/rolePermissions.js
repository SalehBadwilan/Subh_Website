import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import validate from '../../middleware/validate.js';
import { authenticate } from "../../middleware/auth.js";
import { requireAdmin, requireFullAdmin } from "../../middleware/adminAuth.js";

export default function createRolePermissionRoutes({ models }) {
  const router = Router();
const { RolePermission } = models;

router.use(authenticate());
router.use(requireAdmin);

  router.get('/', asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.role_id) where.role_id = req.query.role_id;
    if (req.query.permission_id) where.permission_id = req.query.permission_id;
    const rows = await RolePermission.findAll({ where });
    res.json({ ok: true, data: rows });
  }));

  router.post(
  '/',
  requireFullAdmin,
  [
    body('role_id').isUUID(),
    body('permission_id').isUUID(),
  ], validate, asyncHandler(async (req, res) => {
    const rp = await RolePermission.create(req.body);
    res.status(201).json({ ok: true, data: rp });
  }));

  router.delete(
  '/:role_id/:permission_id',
  requireFullAdmin, asyncHandler(async (req, res) => {
    const deleted = await RolePermission.destroy({
      where: { role_id: req.params.role_id, permission_id: req.params.permission_id },
    });
    if (!deleted) throw notFound('RolePermission');
    res.json({ ok: true, message: 'RolePermission deleted' });
  }));

  return router;
}
