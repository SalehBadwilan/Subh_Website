/**
 * Merchant-employee order routes.
 *
 *   GET   /api/merchant-employee/orders              list orders (paginated)
 *   PATCH /api/merchant-employee/orders/:id/status   advance fulfilment status
 *
 * Identical authorization model to the merchant order route but scoped through
 * the employee's bound merchant. PATCH additionally requires the
 * `orders_status` permission (gated at the router in index.js). Status changes
 * run inside a transaction with an appended OrderStatusHistory row.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { requireEmployeePermission } from '../../../middleware/merchantAuth.js';
import sequelize from '../../../config/database.js';
import { canTransition, MERCHANT_TARGET_STATUSES } from '../../merchant/utils/orderStatus.js';
import { serializeOrder } from '../../merchant/utils/serializers.js';

export default function createEmployeeOrderRoutes() {
  const router = Router();

  // GET list — also gated on `orders_status` for the PATCH, but reads use the
  // broader `orders` permission set at the router level.
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

  // PATCH status — requires the dedicated `orders_status` permission (not just
  // `orders`). Gated here at the route level so a staff member without it is
  // rejected with 403 BEFORE any DB work / state-machine validation runs.
  router.patch(
    '/:id/status',
    requireEmployeePermission('orders_status'),
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
        const order = await Order.findOne({
          where: { id: req.params.id, merchant_id: merchantId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!order) throw notFound('Order');

        if (!canTransition(order.status, targetStatus)) {
          throw new ApiError(409, 'انتقال الحالة غير مسموح به', {
            code: 'invalid_transition',
            from: order.status,
            to: targetStatus,
          });
        }

        const previousStatus = order.status;
        const patch = { status: targetStatus };
        await order.update(patch, { transaction: t });

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

      const full = await Order.findByPk(result.id, {
        include: [{ model: m.OrderItem, as: 'OrderItems', required: false }],
      });
      res.json({ ok: true, data: serializeOrder(full) });
    }),
  );

  return router;
}
