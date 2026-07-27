import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createNotificationRoutes({ models }) {
  const router = Router();
  const { Notification } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.user_id) where.user_id = req.query.user_id;
    if (req.query.is_read !== undefined) where.is_read = req.query.is_read === 'true';
    const { rows, count } = await Notification.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const n = await Notification.findByPk(req.params.id);
    if (!n) throw notFound('Notification');
    res.json({ ok: true, data: n });
  }));

  router.post('/', [
    body('user_id').isUUID(),
    body('title_ar').isString().isLength({ min: 1, max: 150 }),
    body('body_ar').isString(),
    body('channel').optional().isIn(['in_app', 'sms', 'email', 'push']),
  ], validate, asyncHandler(async (req, res) => {
    const n = await Notification.create(req.body);
    res.status(201).json({ ok: true, data: n });
  }));

  router.put('/:id', [
    body('is_read').optional().isBoolean(),
  ], validate, asyncHandler(async (req, res) => {
    const n = await Notification.findByPk(req.params.id);
    if (!n) throw notFound('Notification');
    await n.update({ ...req.body, read_at: req.body.is_read ? new Date() : null });
    res.json({ ok: true, data: n });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const deleted = await Notification.destroy({ where: { id: req.params.id } });
    if (!deleted) throw notFound('Notification');
    res.json({ ok: true, message: 'Notification deleted' });
  }));

  return router;
}
