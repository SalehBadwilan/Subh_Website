/**
 * GET /api/operations/shipments
 *
 * Platform-wide shipment list for the fulfilment team (paginated, filtered,
 * sorted). Each shipment is joined to its order (1:1) with the merchant +
 * customer fields ops needs for dispatch — and crucially WITHOUT exposing
 * sensitive fields (no password hashes, no raw IBAN).
 *
 * Read-only — Admin Employee can access. Mutations on a shipment's status are
 * driven indirectly through PATCH /api/operations/orders/:id/status (the order
 * state machine advances the linked shipment inside the same transaction), so
 * there is intentionally no separate shipment-write endpoint here — that keeps
 * order ↔ shipment status from drifting out of sync.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { serializeShipment } from '../utils/serializers.js';

const SHIPMENT_STATUSES = [
  'pending',
  'packed',
  'handed_to_carrier',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'returned',
];

export default function createOperationsShipmentRoutes({ models }) {
  const router = Router();
  const { Shipment, Order, Merchant, User } = models;

  router.get(
    '/',
    [
      query('status').optional().isIn(SHIPMENT_STATUSES),
      query('carrier').optional().isString().trim().isLength({ max: 100 }),
      query('q').optional().isString().trim().isLength({ max: 100 }),
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
      query('sort').optional().isIn(['newest', 'oldest', 'shipped_desc', 'delivered_desc']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);

      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.carrier) where.carrier = { [Op.iLike]: `%${String(req.query.carrier).trim()}%` };

      const dateWhere = {};
      if (req.query.from) dateWhere[Op.gte] = req.query.from;
      if (req.query.to) dateWhere[Op.lte] = req.query.to;
      if (Object.keys(dateWhere).length) where.shipped_at = dateWhere;

      // Free-text search across tracking number + the joined order number.
      const q = req.query.q ? String(req.query.q).trim() : '';
      const include = [
        {
          model: Order,
          required: false,
          attributes: ['id', 'number', 'status', 'total_sar'],
          include: [
            {
              model: Merchant,
              as: 'Merchant',
              required: false,
              attributes: ['id', 'commercial_name'],
            },
            {
              model: User,
              as: 'User',
              required: false,
              attributes: ['id', 'full_name', 'phone'],
            },
          ],
        },
      ];

      if (q) {
        where[Op.and] = [
          {
            [Op.or]: [
              { tracking_number: { [Op.iLike]: `%${q}%` } },
              { '$Order.number$': { [Op.iLike]: `%${q}%` } },
            ],
          },
        ];
      }

      const sort = req.query.sort || 'newest';
      const order = [];
      switch (sort) {
        case 'oldest':
          order.push(['created_at', 'ASC']);
          break;
        case 'shipped_desc':
          order.push(['shipped_at', 'DESC']);
          break;
        case 'delivered_desc':
          order.push(['delivered_at', 'DESC']);
          break;
        case 'newest':
        default:
          order.push(['created_at', 'DESC']);
      }

      const { rows, count } = await Shipment.findAndCountAll({
        where,
        include,
        limit,
        offset,
        order,
        distinct: true,
        subQuery: false,
      });

      res.json(paginatedResponse(rows.map(serializeShipment), count, { page, limit }));
    }),
  );

  return router;
}
