/**
 * GET /api/merchant/sales-summary
 *
 * Aggregated sales metrics for the authenticated merchant over an optional
 * date range (?from=&to=, default = last 30 days). Returns totals by status,
 * gross revenue, commission estimate, net payable estimate, and a per-day
 * series for charts.
 *
 * All figures derive from real order rows scoped to req.merchant.id — no mocks.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import validate from '../../../middleware/validate.js';
import sequelize from '../../../config/database.js';

export default function createSalesRoutes() {
  const router = Router();

  router.get(
    '/',
    [
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { Order, MerchantProduct } = m; // MerchantProduct not used here directly
      void MerchantProduct;
      const merchantId = req.merchant.id;

      const to = req.query.to || new Date();
      const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Totals grouped by status within the window.
      const statusRows = await Order.findAll({
        where: {
          merchant_id: merchantId,
          placed_at: { [Op.between]: [from, to] },
        },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'total'],
        ],
        group: ['status'],
        raw: true,
      });

      const byStatus = {};
      let gross = 0;
      let ordersCount = 0;
      const REVENUE_STATUSES = ['paid', 'preparing', 'ready_to_ship', 'shipped', 'delivered'];
      for (const r of statusRows) {
        byStatus[r.status] = { count: Number(r.count), total_sar: Number(r.total) };
        ordersCount += Number(r.count);
        if (REVENUE_STATUSES.includes(r.status)) gross += Number(r.total);
      }

      const commissionRate = Number(req.merchant.commission_rate || 0);
      const commission = Number((gross * commissionRate).toFixed(2));
      const net = Number((gross - commission).toFixed(2));

      // Per-day series (date + revenue). Uses date_trunc on Postgres; falls
      // back gracefully on SQLite by grouping on the raw placed_at date string.
      const isPg = sequelize.getDialect() === 'postgres';
      const dayExpr = isPg
        ? sequelize.fn('to_char', sequelize.col('placed_at'), 'YYYY-MM-DD')
        : sequelize.fn('date', sequelize.col('placed_at'));

      const dailyRows = await Order.findAll({
        where: {
          merchant_id: merchantId,
          placed_at: { [Op.between]: [from, to] },
          status: { [Op.in]: REVENUE_STATUSES },
        },
        attributes: [
          [dayExpr, 'day'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'revenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
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
          totals: {
            orders: ordersCount,
            gross_revenue_sar: Number(gross.toFixed(2)),
            commission_rate: commissionRate,
            commission_sar: commission,
            net_payable_sar: net,
          },
          by_status: byStatus,
          daily: dailyRows.map((r) => ({
            day: r.day,
            revenue_sar: Number(r.revenue),
            orders: Number(r.orders),
          })),
        },
      });
    }),
  );

  return router;
}
