/**
 * Merchant order routes.
 *
 *   GET   /api/merchant/orders              list this merchant's orders (paginated)
 *   PATCH /api/merchant/orders/:id/status   advance an order through the
 *                                           fulfilment lifecycle (state machine).
 *
 * Status changes are wrapped in a transaction that also appends an
 * OrderStatusHistory row, so the timeline stays consistent with the order's
 * current status even if a later step fails.
 *
 * Authorization: every query is scoped by req.merchant.id. A request for
 * another merchant's order id resolves to 404 (not 403) so the existence of
 * foreign orders is not leaked.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, badRequest, notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import sequelize from '../../../config/database.js';
import { canTransition, MERCHANT_TARGET_STATUSES } from '../utils/orderStatus.js';
import { serializeOrder } from '../utils/serializers.js';

export default function createMerchantOrderRoutes() {
  const router = Router();

  // --- GET /api/merchant/orders -------------------------------------------
  router.get(
    '/',
    [
      query('status').optional().isIn([
        'pending_payment',
        'paid',
        'preparing',
        'ready_to_ship',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
      ]),
      query('q').optional().isString().trim().isLength({ max: 60 }),
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
      query('sort').optional().isIn(['newest', 'oldest', 'total_asc', 'total_desc']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { Order, OrderItem, User } = m;
      const merchantId = req.merchant.id;
      const { page, limit, offset } = parsePagination(req.query);

      const where = { merchant_id: merchantId };
      if (req.query.status) where.status = req.query.status;

      const placedWhere = {};
      if (req.query.from) placedWhere[Op.gte] = req.query.from;
      if (req.query.to) placedWhere[Op.lte] = req.query.to;
      if (Object.keys(placedWhere).length) where.placed_at = placedWhere;

      const q = req.query.q ? String(req.query.q).trim() : '';
      if (q) {
        // match on order number OR customer phone/name via a join filter.
        // Implemented as an OR on number + a sub-query on user fields.
        where[Op.and] = [
          {
            [Op.or]: [
              { number: { [Op.iLike]: `%${q}%` } },
              { '$User.phone$': { [Op.iLike]: `%${q}%` } },
              { '$User.full_name$': { [Op.iLike]: `%${q}%` } },
            ],
          },
        ];
      }

      const sort = req.query.sort || 'newest';
      const order = [];
      switch (sort) {
        case 'oldest':
          order.push(['placed_at', 'ASC']);
          break;
        case 'total_asc':
          order.push(['total_sar', 'ASC']);
          break;
        case 'total_desc':
          order.push(['total_sar', 'DESC']);
          break;
        case 'newest':
        default:
          order.push(['placed_at', 'DESC']);
      }

      const { rows, count } = await Order.findAndCountAll({
        where,
        include: [
          { model: OrderItem, as: 'OrderItems', required: false },
          { model: User, as: 'User', required: false, attributes: ['id', 'full_name', 'phone'] },
        ],
        limit,
        offset,
        order,
        distinct: true,
        subQuery: false,
      });

      res.json(paginatedResponse(rows.map(serializeOrder), count, { page, limit }));
    }),
  );

  // --- PATCH /api/merchant/orders/:id/status ------------------------------
  router.patch(
    '/:id/status',
    [
      body('status')
        .isIn(MERCHANT_TARGET_STATUSES)
        .withMessage(`status يجب أن يكون أحد: ${MERCHANT_TARGET_STATUSES.join(', ')}`),
      body('comment_ar').optional().isString().isLength({ max: 500 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { Order, OrderStatusHistory } = m;
      const merchantId = req.merchant.id;
      const { status: targetStatus, comment_ar } = req.body;

      const result = await sequelize.transaction(async (t) => {
        // Lock the order row for the duration of the transition.
        const order = await Order.findOne({
          where: { id: req.params.id, merchant_id: merchantId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!order) throw notFound('Order');

        // Validate the transition against the state machine.
        if (!canTransition(order.status, targetStatus)) {
          throw new ApiError(409, 'انتقال الحالة غير مسموح به', {
            code: 'invalid_transition',
            from: order.status,
            to: targetStatus,
          });
        }

        const previousStatus = order.status;

        // Apply + stamp lifecycle timestamps where relevant.
        const patch = { status: targetStatus };
        // We do NOT set paid_at here (payment layer owns that). shipped is
        // a merchant action so we stamp it.
        if (targetStatus === 'shipped') patch.shippedAt = new Date();

        await order.update(patch, { transaction: t });

        // Append-only history row (kept consistent within the same txn).
        await OrderStatusHistory.create(
          {
            order_id: order.id,
            from_status: previousStatus,
            to_status: targetStatus,
            comment_ar: comment_ar || null,
            actor_id: req.user.id,
          },
          { transaction: t },
        );

        return order;
      });

      // Reload with items for the response.
      const full = await Order.findByPk(result.id, {
        include: [{ model: m.OrderItem, as: 'OrderItems', required: false }],
      });
      res.json({ ok: true, data: serializeOrder(full) });
    }),
  );

  return router;
}
