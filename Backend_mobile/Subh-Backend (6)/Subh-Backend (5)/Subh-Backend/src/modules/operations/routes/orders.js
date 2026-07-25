/**
 * Operations order routes (Stage 4).
 *
 *   GET   /api/operations/orders              platform-wide list (paginated,
 *                                            filtered, sorted) — fulfilment view
 *   PATCH /api/operations/orders/:id/status   advance an order through the
 *                                            fulfilment lifecycle (state machine).
 *
 * Status changes are wrapped in a transaction that also appends an
 * OrderStatusHistory row, so the timeline stays consistent with the order's
 * current status even if a later step fails. When the transition lands on
 * `shipped` or `delivered`, the linked Shipment row (1:1 per order) is advanced
 * in the SAME transaction so fulfilment tracking never drifts from the order.
 *
 * Authorization: every route is platform-wide (operations acts on behalf of the
 * whole platform, not a single merchant). Mutations require
 * `requireOperationsWrite` — Admin Employee (read-only) is blocked at PATCH.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import sequelize from '../../../config/database.js';
import { requireOperationsWrite } from '../../../middleware/operationsAuth.js';
import { canTransition, OPERATIONS_TARGET_STATUSES } from '../utils/orderStatus.js';
import { serializeOrder } from '../utils/serializers.js';

const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'preparing',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export default function createOperationsOrderRoutes({ models }) {
  const router = Router();
  const {
  Order,
  OrderItem,
  OrderStatusHistory,
  Shipment,
  Merchant,
  User,
  Notification,
} = models;

  // --- GET /api/operations/orders -------------------------------------------
  router.get(
    '/',
    [
      query('status').optional().isIn(ORDER_STATUSES),
      query('merchant_id').optional().isUUID(),
      query('q').optional().isString().trim().isLength({ max: 60 }),
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
      query('sort').optional().isIn(['newest', 'oldest', 'total_asc', 'total_desc']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);

      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.merchant_id) where.merchant_id = req.query.merchant_id;

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
          { model: Merchant, as: 'Merchant', required: false, attributes: ['id', 'commercial_name'] },
          { model: Shipment, as: 'Shipment', required: false },
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

  // --- PATCH /api/operations/orders/:id/status ------------------------------
  router.patch(
    '/:id/status',
    [
      body('status')
        .isIn(OPERATIONS_TARGET_STATUSES)
        .withMessage(`status يجب أن يكون أحد: ${OPERATIONS_TARGET_STATUSES.join(', ')}`),
      body('comment_ar').optional().isString().isLength({ max: 500 }),
    ],
    validate,
    requireOperationsWrite,
    asyncHandler(async (req, res) => {
      const { status: targetStatus, comment_ar } = req.body;

      const result = await sequelize.transaction(async (t) => {
        // Lock the order row for the duration of the transition.
        const order = await Order.findOne({
          where: { id: req.params.id },
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

        // Apply + stamp lifecycle timestamps where relevant. The order table only
        // carries placed_at / paid_at / cancelled_at — shipping timestamps
        // (shipped_at, delivered_at) live on the linked Shipment row and are
        // stamped there below. paid_at is owned by the payment layer.
        const patch = { status: targetStatus };
        if (targetStatus === 'cancelled') patch.cancelled_at = new Date();

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
        const notificationMap = {
  preparing: {
    title: 'تم بدء تجهيز طلبك',
    body: `بدأنا تجهيز طلبك رقم ${order.number}.`,
  },
  ready_to_ship: {
    title: 'طلبك جاهز للشحن',
    body: `طلبك رقم ${order.number} أصبح جاهزًا للشحن.`,
  },
  shipped: {
    title: 'خرج طلبك للتوصيل',
    body: `طلبك رقم ${order.number} في الطريق إليك.`,
  },
  delivered: {
    title: 'تم توصيل طلبك',
    body: `تم توصيل طلبك رقم ${order.number}. نتمنى أن ينال إعجابك.`,
  },
};

const notification = notificationMap[targetStatus];

if (notification) {
  await Notification.create(
    {
      user_id: order.user_id,
      channel: 'in_app',
      title_ar: notification.title,
      body_ar: notification.body,
      payload: {
        order_id: order.id,
        order_number: order.number,
        status: targetStatus,
      },
    },
    { transaction: t },
  );
}

        // Keep the linked Shipment (1:1 per order) in sync with fulfilment
        // transitions. An order has at most one shipment; if it does not exist
        // yet we create it when the order moves into fulfilment.
        const SHIPMENT_TRANSITIONS = ['shipped', 'delivered', 'returned'];
        if (SHIPMENT_TRANSITIONS.includes(targetStatus)) {
          const shipmentPatch = {};
          if (targetStatus === 'shipped') {
            // Map order-level shipped to "handed_to_carrier" so the shipment
            // tracking column reflects a real carrier handoff.
            shipmentPatch.status = 'handed_to_carrier';
            shipmentPatch.shipped_at = new Date();
          } else if (targetStatus === 'delivered') {
            shipmentPatch.status = 'delivered';
            shipmentPatch.delivered_at = new Date();
          } else if (targetStatus === 'returned') {
            shipmentPatch.status = 'returned';
          }

          let shipment = await Shipment.findOne({
            where: { order_id: order.id },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (shipment) {
            await shipment.update(shipmentPatch, { transaction: t });
          } else {
            // No shipment row yet — create the minimal record so the link is
            // never broken. Carrier/tracking get filled later by ops.
            shipment = await Shipment.create(
              {
                order_id: order.id,
                status: shipmentPatch.status || 'pending',
                shipped_at: shipmentPatch.shipped_at || null,
                delivered_at: shipmentPatch.delivered_at || null,
              },
              { transaction: t },
            );
          }
        }

        return order;
      });

      // Reload with associations for the response.
      const full = await Order.findByPk(result.id, {
        include: [
          { model: OrderItem, as: 'OrderItems', required: false },
          { model: User, as: 'User', required: false, attributes: ['id', 'full_name', 'phone'] },
          { model: Merchant, as: 'Merchant', required: false, attributes: ['id', 'commercial_name'] },
          { model: Shipment, as: 'Shipment', required: false },
        ],
      });
      res.json({ ok: true, data: serializeOrder(full) });
    }),
  );

  return router;
}
