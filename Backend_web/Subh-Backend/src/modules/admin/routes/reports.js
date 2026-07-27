/**
 * GET /api/admin/reports
 *
 * Aggregated business reports (read-only). Supports a date range filter via
 * ?from=ISO&to=ISO so the admin can scope the report to a window.
 *
 * Returned blocks:
 *   - sales           total / fulfilled / cancelled GMV + order counts
 *   - merchants       top merchants by fulfilled GMV (limit 10)
 *   - catalog         active vs archived product/package counts
 *   - applications    status breakdown of merchant applications
 *
 * All numeric sums are returned as plain Numbers (DECIMAL → Number) for stable
 * JSON serialization on the client.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import validate from '../../../middleware/validate.js';
import sequelize from '../../../config/database.js';

const REVENUE_STATUSES = ['shipped', 'delivered'];
const CANCELLED_STATUSES = ['cancelled', 'returned'];

export default function createAdminReportRoutes({ models }) {
  const router = Router();
  const { Order, Merchant, Product, Package, MerchantApplication } = models;

  router.get(
    '/',
    [
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const dateRange = {};
      if (req.query.from) dateRange[Op.gte] = req.query.from;
      if (req.query.to) dateRange[Op.lte] = req.query.to;
      const dateWhere = Object.keys(dateRange).length
        ? { placed_at: dateRange }
        : null;

      // --- Sales block --------------------------------------------------------
      const salesWhere = dateWhere || {};
      const totalRow = await Order.findOne({
        where: salesWhere,
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'gmv'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        ],
        raw: true,
      });

      const fulfilledRow = await Order.findOne({
        where: { ...salesWhere, status: { [Op.in]: REVENUE_STATUSES } },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'gmv'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        ],
        raw: true,
      });

      const cancelledRow = await Order.findOne({
        where: { ...salesWhere, status: { [Op.in]: CANCELLED_STATUSES } },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'gmv'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        ],
        raw: true,
      });

      // --- Top merchants by fulfilled GMV -------------------------------------
      const topMerchants = await Order.findAll({
        where: { ...salesWhere, status: { [Op.in]: REVENUE_STATUSES } },
        attributes: [
          'merchant_id',
          [sequelize.fn('SUM', sequelize.col('total_sar')), 'gmv'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        ],
        group: ['merchant_id'],
        order: [[sequelize.literal('gmv'), 'DESC']],
        limit: 10,
        raw: true,
      });

      // Resolve merchant names (one query, then map in-memory).
      const topMerchantIds = topMerchants.map((r) => r.merchant_id);
      const merchantRows = topMerchantIds.length
        ? await Merchant.findAll({
            where: { id: { [Op.in]: topMerchantIds } },
            attributes: ['id', 'commercial_name', 'status'],
          })
        : [];
      const merchantMap = new Map(merchantRows.map((m) => [m.id, m]));

      // --- Catalog block ------------------------------------------------------
      const productStatusRows = await Product.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const productsByStatus = {};
      for (const r of productStatusRows) productsByStatus[r.status] = Number(r.count);

      const packageStatusRows = await Package.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const packagesByStatus = {};
      for (const r of packageStatusRows) packagesByStatus[r.status] = Number(r.count);

      // --- Applications block -------------------------------------------------
      const applicationRows = await MerchantApplication.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const applicationsByStatus = {};
      for (const r of applicationRows) applicationsByStatus[r.status] = Number(r.count);

      res.json({
        ok: true,
        data: {
          filters: {
            from: req.query.from || null,
            to: req.query.to || null,
          },
          sales: {
            total_gmv_sar: Number(totalRow?.gmv || 0),
            total_orders: Number(totalRow?.orders || 0),
            fulfilled_gmv_sar: Number(fulfilledRow?.gmv || 0),
            fulfilled_orders: Number(fulfilledRow?.orders || 0),
            cancelled_gmv_sar: Number(cancelledRow?.gmv || 0),
            cancelled_orders: Number(cancelledRow?.orders || 0),
          },
          top_merchants: topMerchants.map((r) => {
            const m = merchantMap.get(r.merchant_id);
            return {
              merchant_id: r.merchant_id,
              commercial_name: m?.commercial_name || null,
              merchant_status: m?.status || null,
              gmv_sar: Number(r.gmv || 0),
              orders: Number(r.orders || 0),
            };
          }),
          catalog: {
            products_by_status: productsByStatus,
            packages_by_status: packagesByStatus,
          },
          applications: {
            by_status: applicationsByStatus,
          },
        },
      });
    }),
  );

  return router;
}
