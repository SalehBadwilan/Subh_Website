/**
 * GET /api/admin/dashboard
 *
 * Aggregated platform KPIs for Subh staff. All counts are platform-wide (not
 * scoped to any merchant), unlike the merchant dashboard. Read-only — Admin
 * Employee can access.
 *
 * Returns: counts of merchants by status, pending merchant applications,
 * products by status, packages, users, orders by status + GMV (revenue) for
 * fulfilled orders.
 */
import { Router } from 'express';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import sequelize from '../../../config/database.js';

export default function createAdminDashboardRoutes({ models }) {
  const router = Router();
  const { Merchant, MerchantApplication, Product, Package, User, Order } = models;

  // Fulfilled revenue statuses (matches the merchant dashboard convention).
  const REVENUE_STATUSES = ['shipped', 'delivered'];

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      // Merchants grouped by status (one grouped query).
      const merchantRows = await Merchant.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const merchantsByStatus = {};
      let totalMerchants = 0;
      for (const r of merchantRows) {
        merchantsByStatus[r.status] = Number(r.count);
        totalMerchants += Number(r.count);
      }

      // Pending merchant applications awaiting review.
      const pendingApplications = await MerchantApplication.count({
        where: { status: { [Op.in]: ['pending', 'under_review'] } },
      });

      // Products grouped by status.
      const productRows = await Product.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const productsByStatus = {};
      let totalProducts = 0;
      for (const r of productRows) {
        productsByStatus[r.status] = Number(r.count);
        totalProducts += Number(r.count);
      }

      const [totalPackages, totalUsers] = await Promise.all([
        Package.count(),
        User.count(),
      ]);

      // Orders grouped by status (one query) — platform-wide.
      const orderRows = await Order.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const ordersByStatus = {};
      let totalOrders = 0;
      for (const r of orderRows) {
        ordersByStatus[r.status] = Number(r.count);
        totalOrders += Number(r.count);
      }

      // GMV (Gross Merchandise Value) of fulfilled orders — the platform's
      // realized revenue. Summed platform-wide across all merchants.
      const revenueRow = await Order.findOne({
        where: { status: { [Op.in]: REVENUE_STATUSES } },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'gmv'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'fulfilled'],
        ],
        raw: true,
      });

      res.json({
        ok: true,
        data: {
          kpis: {
            total_merchants: totalMerchants,
            merchants_by_status: merchantsByStatus,
            pending_applications: pendingApplications,
            total_products: totalProducts,
            products_by_status: productsByStatus,
            total_packages: totalPackages,
            total_users: totalUsers,
            total_orders: totalOrders,
            orders_by_status: ordersByStatus,
            gmv_sar: Number(revenueRow?.gmv || 0),
            fulfilled_orders: Number(revenueRow?.fulfilled || 0),
          },
        },
      });
    }),
  );

  return router;
}
