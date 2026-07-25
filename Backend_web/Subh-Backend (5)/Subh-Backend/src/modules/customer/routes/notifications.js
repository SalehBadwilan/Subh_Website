/**
 * Customer notification routes (authenticated).
 *
 *   GET  /api/notifications           list the user's notifications (paginated)
 *   POST /api/notifications/read-all  mark all of the user's notifications read
 *
 * Authorization: scoped to req.user.id. A user only ever sees / touches their
 * own notifications.
 */
import { Router } from 'express';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import authenticate from '../../../middleware/auth.js';

export default function createCustomerNotificationRoutes({ models }) {
  const router = Router();
  const { Notification } = models;

  router.use(authenticate());

  const serializeNotification = (n) => ({
    id: n.id,
    channel: n.channel,
    title_ar: n.title_ar,
    body_ar: n.body_ar,
    payload: n.payload,
    is_read: n.is_read,
    read_at: n.read_at,
    created_at: n.created_at,
  });

  // --- GET /api/notifications ----------------------------------------------
  router.get(
    '/',
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('unreadOnly').optional().isBoolean().toBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = { user_id: req.user.id };
      if (req.query.unreadOnly === true || req.query.unreadOnly === 'true') {
        where.is_read = false;
      }

      const { rows, count } = await Notification.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      res.json(paginatedResponse(rows.map(serializeNotification), count, { page, limit }));
    }),
  );

  // --- POST /api/notifications/read-all ------------------------------------
  router.post(
    '/read-all',
    asyncHandler(async (req, res) => {
      const [updatedCount] = await Notification.update(
        { is_read: true, read_at: new Date() },
        { where: { user_id: req.user.id, is_read: false } },
      );
      res.json({ ok: true, data: { marked_read: updatedCount } });
    }),
  );

  return router;
}
