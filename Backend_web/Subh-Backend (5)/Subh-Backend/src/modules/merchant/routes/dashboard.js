/**
 * GET /api/merchant/dashboard
 *
 * Aggregated KPIs for the authenticated merchant's store: order counts by
 * status, revenue (paid+post-paid states), low-stock SKUs, and recent orders.
 * All numbers are scoped to req.merchant.id.
 */
import { Router } from 'express';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import sequelize from '../../../config/database.js';

export default function createDashboardRoutes() {
  const router = Router();

  // Statuses that count toward "fulfilled revenue" (the merchant actually
  // shipped/delivered and expects payout).
  const REVENUE_STATUSES = ['shipped', 'delivered'];

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const merchantId = req.merchant.id;
      const { Order, ProductUpdateRequest, MerchantProduct, Inventory } = m;

      // Order counts grouped by status (one query).
      const statusRows = await Order.findAll({
        where: { merchant_id: merchantId },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const ordersByStatus = {};
      let totalOrders = 0;
      for (const r of statusRows) {
        ordersByStatus[r.status] = Number(r.count);
        totalOrders += Number(r.count);
      }

      // Revenue from fulfilled orders.
      const revenueRow = await Order.findOne({
        where: { merchant_id: merchantId, status: { [Op.in]: REVENUE_STATUSES } },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_sar')), 0), 'revenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'fulfilled'],
        ],
        raw: true,
      });
      const revenue = Number(revenueRow?.revenue || 0);

      // Pending product update requests (merchant is waiting on Subh review).
      const pendingUpdateRequests = await ProductUpdateRequest.count({
        where: { merchant_id: merchantId, status: { [Op.in]: ['pending', 'under_review'] } },
      });

      // Active catalog listings for this merchant.
      const activeListings = await MerchantProduct.count({
        where: { merchant_id: merchantId, is_active: true },
      });

      // Low-stock SKUs among this merchant's sellables (available <= threshold).
      // We resolve the merchant's product ids first, then check inventory.
      const merchantProducts = await MerchantProduct.findAll({
        where: { merchant_id: merchantId },
        attributes: ['product_id', 'package_id'],
        raw: true,
      });
      const productIds = merchantProducts.map((p) => p.product_id).filter(Boolean);
      const packageIds = merchantProducts.map((p) => p.package_id).filter(Boolean);

      const orClauses = [];
      if (productIds.length) orClauses.push({ sellable_type: 'product', sellable_id: { [Op.in]: productIds } });
      if (packageIds.length) orClauses.push({ sellable_type: 'package', sellable_id: { [Op.in]: packageIds } });

      let lowStockCount = 0;
      if (orClauses.length) {
        lowStockCount = await Inventory.count({
          where: {
            [Op.and]: [
              { [Op.or]: orClauses },
              sequelize.where(
                sequelize.literal('(on_hand - reserved)'),
                '<=',
                sequelize.col('reorder_threshold'),
              ),
            ],
          },
        });
      }

      res.json({
        ok: true,
        data: {
          merchant_id: merchantId,
          merchant_status: req.merchant.status,
          commercial_name: req.merchant.commercial_name,
          kpis: {
            total_orders: totalOrders,
            orders_by_status: ordersByStatus,
            revenue_sar: revenue,
            fulfilled_orders: Number(revenueRow?.fulfilled || 0),
            active_listings: activeListings,
            pending_update_requests: pendingUpdateRequests,
            low_stock_skus: lowStockCount,
          },
        },
      });
    }),
  );

  return router;
}
