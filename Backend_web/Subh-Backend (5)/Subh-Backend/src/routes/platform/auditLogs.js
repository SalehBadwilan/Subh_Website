import { Router } from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';

// Append-only audit trail: READ only. Writes happen from inside services.
export default function createAuditLogRoutes({ models }) {
  const router = Router();
  const { AuditLog } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id) where.entity_id = req.query.entity_id;
    if (req.query.actor_id) where.actor_id = req.query.actor_id;
    if (req.query.action) where.action = req.query.action;
    const { rows, count } = await AuditLog.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const a = await AuditLog.findByPk(req.params.id);
    if (!a) throw notFound('AuditLog');
    res.json({ ok: true, data: a });
  }));

  return router;
}
