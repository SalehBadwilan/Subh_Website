/**
 * GET /api/merchant-employee/reports
 *
 * Operational reports for the employee's bound merchant. Supports a date range
 * and a `group_by` dimension (status | day). Returns aggregated counts +
 * revenue per group. Scoped to req.merchant.id — read-only.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import validate from '../../../middleware/validate.js';
import sequelize from '../../../config/database.js';

export default function createEmployeeReportRoutes() {
  const router = Router();

  router.get(
    '/',
    [
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
      query('group_by').optional().isIn(['status', 'day']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { Order } = m;
      const merchantId = req.merchant.id;

      const to = req.query.to || new Date();
      const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const groupBy = req.query.group_by || 'status';

      const baseWhere = {
        merchant_id: merchantId,
        placed_at: { [Op.between]: [from, to] },
      };

      const isPg = sequelize.getDialect() === 'postgres';

      if (groupBy === 'status') {
        const rows = await Order.findAll({
          where: baseWhere,
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'revenue'],
          ],
          group: ['status'],
          order: [sequelize.literal('count DESC')],
          raw: true,
        });
        return res.json({
          ok: true,
          data: {
            merchant_id: merchantId,
            range: { from, to },
            group_by: 'status',
            groups: rows.map((r) => ({
              key: r.status,
              count: Number(r.count),
              revenue_sar: Number(r.revenue),
            })),
          },
        });
      }

      // group_by = day
      const dayExpr = isPg
        ? sequelize.fn('to_char', sequelize.col('placed_at'), 'YYYY-MM-DD')
        : sequelize.fn('date', sequelize.col('placed_at'));

      const rows = await Order.findAll({
        where: baseWhere,
        attributes: [
          [dayExpr, 'day'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'revenue'],
        ],
        group: ['day'],
        order: [sequelize.literal('day ASC')],
        raw: true,
      });

      res.json({
        ok: true,
        data: {
          merchant_id: merchantId,
          range: { from, to },
          group_by: 'day',
          groups: rows.map((r) => ({
            key: r.day,
            count: Number(r.count),
            revenue_sar: Number(r.revenue),
          })),
        },
      });
    }),
  );

  return router;
}
