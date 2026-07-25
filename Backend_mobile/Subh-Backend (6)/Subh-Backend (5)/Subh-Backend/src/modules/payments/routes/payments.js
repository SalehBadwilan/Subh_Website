/**
 * Customer payment routes (authenticated).
 *
 *   POST /api/payments/initiate   start a payment for a pending order
 *   POST /api/payments/:id/confirm confirm a payment client-side (card/3DS)
 *   GET  /api/payments/:id        read one of the user's own payments
 *   GET  /api/payments            list the user's payments (paginated)
 *
 * The generic READ-only router at src/routes/payments/payments.js stays mounted
 * (admin reads by order_id/status); these customer verbs (POST, and GET scoped
 * to the authenticated user) are registered FIRST so they win. No path
 * collision: initiate/confirm are distinct sub-paths.
 *
 * Authorization: every query is scoped to the authenticated user. A user can
 * only ever pay for / read their own orders and payments.
 */
import { Router } from 'express';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import authenticate from '../../../middleware/auth.js';

import paymentService from '../services/paymentService.js';

export default function createCustomerPaymentRoutes({ models }) {
  const router = Router();
  const { Payment, Order } = models;

  router.use(authenticate());

  // --- POST /api/payments/initiate -----------------------------------------
  // Body: { order_id, method? }
  router.post(
    '/initiate',
    [
      body('order_id').isUUID().withMessage('order_id مطلوب وصالح'),
      body('method')
        .optional()
        .isIn(['card', 'apple', 'stc', 'mada', 'stc_pay', 'apple_pay', 'transfer', 'wallet']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { payment, intent } = await paymentService.initiatePayment({
        models,
        userId: req.user.id,
        orderId: req.body.order_id,
        method: req.body.method || 'card',
      });
      res.status(201).json({
        ok: true,
        data: {
          payment: paymentService.serializePayment(payment),
          intent,
        },
      });
    }),
  );

  // --- POST /api/payments/:id/confirm --------------------------------------
  // Body: { source?: { last4?, token?, ... } }
  router.post(
    '/:id/confirm',
    [body('source').optional().isObject()],
    validate,
    asyncHandler(async (req, res) => {
      const { payment, status, alreadyPaid } = await paymentService.confirmPayment({
        models,
        userId: req.user.id,
        paymentId: req.params.id,
        source: req.body.source,
      });
      res.json({
        ok: true,
        data: { payment: paymentService.serializePayment(payment), status, already_paid: !!alreadyPaid },
      });
    }),
  );

  // --- GET /api/payments/:id -----------------------------------------------
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      // Scope by the authenticated user via the order.
      const payment = await Payment.findByPk(req.params.id, {
        include: { model: Order, as: 'Order', required: true },
      });
      if (!payment || !payment.Order || payment.Order.user_id !== req.user.id) {
        throw notFound('Payment');
      }
      res.json({ ok: true, data: paymentService.serializePayment(payment) });
    }),
  );

  // --- GET /api/payments ---------------------------------------------------
  router.get(
    '/',
    [
      query('status').optional().isIn([
        'initiated',
        'authorized',
        'captured',
        'failed',
        'refunded',
        'disputed',
      ]),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);

      // List payments belonging to the authenticated user's orders only.
      const userOrderIds = (await Order.findAll({
        where: { user_id: req.user.id },
        attributes: ['id'],
      })).map((o) => o.id);

      if (!userOrderIds.length) {
        return res.json(paginatedResponse([], 0, { page, limit }));
      }

      const where = { order_id: userOrderIds };
      if (req.query.status) where.status = req.query.status;

      const { rows, count } = await Payment.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      res.json(paginatedResponse(rows.map(paymentService.serializePayment), count, { page, limit }));
    }),
  );

  return router;
}
