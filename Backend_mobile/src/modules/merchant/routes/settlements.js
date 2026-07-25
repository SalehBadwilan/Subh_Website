/**
 * GET /api/merchant/settlements
 *
 * Lists the merchant's payout (settlement) rows. Read-only. Each row covers a
 * period and shows gross sales, commission deducted, refunds deducted, and the
 * net payable amount. Paginated + filterable by status.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import sequelize from '../../../config/database.js';
import { serializeSettlement } from '../utils/serializers.js';

const sumCoalesce = (col) =>
  sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col(col)), 0);

export default function createSettlementRoutes() {
  const router = Router();

  router.get(
    '/',
    [
      query('status').optional().isIn(['pending', 'processing', 'paid', 'failed']),
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
      query('sort').optional().isIn(['newest', 'oldest', 'net_asc', 'net_desc']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { Settlement } = m;
      const merchantId = req.merchant.id;
      const { page, limit, offset } = parsePagination(req.query);

      const where = { merchant_id: merchantId };
      if (req.query.status) where.status = req.query.status;

      const periodWhere = {};
      if (req.query.from) periodWhere[Op.gte] = req.query.from;
      if (req.query.to) periodWhere[Op.lte] = req.query.to;
      if (Object.keys(periodWhere).length) where.period_to = periodWhere;

      const sort = req.query.sort || 'newest';
      const order = [];
      switch (sort) {
        case 'oldest':
          order.push(['period_to', 'ASC']);
          break;
        case 'net_asc':
          order.push(['net_payable_sar', 'ASC']);
          break;
        case 'net_desc':
          order.push(['net_payable_sar', 'DESC']);
          break;
        case 'newest':
        default:
          order.push(['period_to', 'DESC']);
      }

      const { rows, count } = await Settlement.findAndCountAll({
        where,
        limit,
        offset,
        order,
      });

      // Running totals for the current filter (helps the UI show "X SAR pending").
      const totalRow = await Settlement.findOne({
        where,
        attributes: [
          [sumCoalesce('gross_sales_sar'), 'gross'],
          [sumCoalesce('commission_sar'), 'commission'],
          [sumCoalesce('refunds_sar'), 'refunds'],
          [sumCoalesce('net_payable_sar'), 'net'],
        ],
        raw: true,
      });

      res.json({
        ...paginatedResponse(rows.map(serializeSettlement), count, { page, limit }),
        summary: {
          gross_sales_sar: Number(totalRow?.gross || 0),
          commission_sar: Number(totalRow?.commission || 0),
          refunds_sar: Number(totalRow?.refunds || 0),
          net_payable_sar: Number(totalRow?.net || 0),
        },
      });
    }),
  );

  return router;
}
