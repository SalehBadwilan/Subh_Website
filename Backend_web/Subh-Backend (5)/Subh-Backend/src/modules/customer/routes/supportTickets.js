/**
 * Customer support ticket route (authenticated).
 *
 *   POST /api/support/tickets   create a support ticket for the current user
 *
 * The customer creates a ticket (subject + message) optionally tied to one of
 * THEIR OWN orders (verified). The ticket starts as 'open' and is advanced by
 * the support team out of band.
 */
import { Router } from 'express';
import { body } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound } from '../../../utils/ApiError.js';
import validate from '../../../middleware/validate.js';
import authenticate from '../../../middleware/auth.js';

export default function createCustomerSupportRoutes({ models }) {
  const router = Router();
  const { SupportTicket, Order } = models;

  router.use(authenticate());

  router.post(
    '/tickets',
    [
      body('subject_ar').isString().trim().isLength({ min: 3, max: 200 }).withMessage('subject مطلوب (3-200 حرف)'),
      body('message_ar').isString().trim().isLength({ min: 5, max: 5000 }).withMessage('message مطلوب (5-5000 حرف)'),
      body('order_id').optional().isUUID(),
      body('category')
        .optional()
        .isIn(['general', 'billing', 'delivery', 'product', 'returns', 'other']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      let orderId = null;
      if (req.body.order_id) {
        // The referenced order MUST belong to the user.
        const order = await Order.findOne({
          where: { id: req.body.order_id, user_id: req.user.id },
        });
        if (!order) throw notFound('Order');
        orderId = order.id;
      }

      const ticket = await SupportTicket.create({
        user_id: req.user.id,
        order_id: orderId,
        subject_ar: req.body.subject_ar,
        message_ar: req.body.message_ar,
        category: req.body.category || 'general',
        status: 'open',
      });

      res.status(201).json({
        ok: true,
        data: {
          id: ticket.id,
          subject_ar: ticket.subject_ar,
          message_ar: ticket.message_ar,
          order_id: ticket.order_id,
          category: ticket.category,
          status: ticket.status,
          created_at: ticket.created_at,
        },
      });
    }),
  );

  return router;
}
