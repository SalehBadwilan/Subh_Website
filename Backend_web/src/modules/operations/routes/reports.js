/**
 * GET /api/operations/reports
 *
 * Operations-focused aggregated reports (read-only). Supports a date range
 * filter via ?from=ISO&to=ISO scoped to order.placed_at.
 *
 * Returned blocks:
 *   - fulfilment       orders by status + counts of shipped / delivered /
 *                      cancelled / returned within the window
 *   - shipments        by-status breakdown + delivery success rate
 *   - inventory        stock health (low / out counts) + top adjusted SKUs
 *                      (most-touched inventory rows by movement count)
 *   - adjustments      recent stock adjustments summary (net delta per SKU)
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

export default function createOperationsReportRoutes({ models }) {
  const router = Router();
  const { Order, Shipment, Inventory, StockMovement, Product, Package } = models;

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
      const dateWhere = Object.keys(dateRange).length ? { placed_at: dateRange } : null;

      // --- Fulfilment block --------------------------------------------------
      const fulfilWhere = dateWhere || {};
      const orderStatusRows = await Order.findAll({
        where: fulfilWhere,
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const ordersByStatus = {};
      for (const r of orderStatusRows) ordersByStatus[r.status] = Number(r.count);

      const shippedCount = ordersByStatus.shipped || 0;
      const deliveredCount = ordersByStatus.delivered || 0;
      const cancelledCount = ordersByStatus.cancelled || 0;
      const returnedCount = ordersByStatus.returned || 0;

      // --- Shipments block ---------------------------------------------------
      const shipmentStatusRows = await Shipment.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const shipmentsByStatus = {};
      let totalShipments = 0;
      for (const r of shipmentStatusRows) {
        shipmentsByStatus[r.status] = Number(r.count);
        totalShipments += Number(r.count);
      }
      const shipmentsDelivered = shipmentsByStatus.delivered || 0;
      const shipmentsFailed =
        (shipmentsByStatus.failed_delivery || 0) + (shipmentsByStatus.returned || 0);
      const deliverySuccessRate =
        totalShipments > 0
          ? Number(((shipmentsDelivered / totalShipments) * 100).toFixed(2))
          : null;

      // --- Inventory health --------------------------------------------------
      const inventoryRows = await Inventory.findAll({
        attributes: ['on_hand', 'reserved', 'reorder_threshold'],
        raw: true,
      });
      let totalSkus = inventoryRows.length;
      let lowStockSkus = 0;
      let outOfStockSkus = 0;
      let totalUnitsOnHand = 0;
      for (const inv of inventoryRows) {
        const available = Math.max(0, (inv.on_hand || 0) - (inv.reserved || 0));
        const threshold = inv.reorder_threshold || 0;
        totalUnitsOnHand += inv.on_hand || 0;
        if (available <= 0) outOfStockSkus += 1;
        else if (available <= threshold) lowStockSkus += 1;
      }

      // --- Top adjusted SKUs (by movement count) ----------------------------
      // Group movements by inventory_id, count rows + sum delta. Then resolve
      // the SKU name in-memory.
      const movementRows = await StockMovement.findAll({
        attributes: [
          'inventory_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'movements'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('delta')), 0), 'net_delta'],
        ],
        group: ['inventory_id'],
        order: [[sequelize.literal('movements'), 'DESC']],
        limit: 10,
        raw: true,
      });
      const topInventoryIds = movementRows.map((r) => r.inventory_id);
      const topInventory = topInventoryIds.length
        ? await Inventory.findAll({
            where: { id: { [Op.in]: topInventoryIds } },
            attributes: ['id', 'sku', 'sellable_type', 'sellable_id', 'on_hand'],
            raw: true,
          })
        : [];
      const productIds = topInventory
        .filter((i) => i.sellable_type === 'product')
        .map((i) => i.sellable_id);
      const packageIds = topInventory
        .filter((i) => i.sellable_type === 'package')
        .map((i) => i.sellable_id);
      const topProducts = productIds.length
        ? await Product.findAll({
            where: { id: { [Op.in]: productIds } },
            attributes: ['id', 'name_ar'],
            raw: true,
          })
        : [];
      const topPackages = packageIds.length
        ? await Package.findAll({
            where: { id: { [Op.in]: packageIds } },
            attributes: ['id', 'name_ar'],
            raw: true,
          })
        : [];
      const nameBySellable = {};
      for (const p of topProducts) nameBySellable[`product:${p.id}`] = p.name_ar;
      for (const p of topPackages) nameBySellable[`package:${p.id}`] = p.name_ar;
      const invById = new Map(topInventory.map((i) => [i.id, i]));

      // --- Adjustments summary ----------------------------------------------
      // Total adjustment rows + net units moved in the date window (if any).
      const adjustWhere = { type: 'adjustment' };
      if (dateWhere) adjustWhere.created_at = dateRange;
      const adjustRow = await StockMovement.findOne({
        where: adjustWhere,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('delta')), 0), 'net_delta'],
        ],
        raw: true,
      });

      res.json({
        ok: true,
        data: {
          filters: {
            from: req.query.from || null,
            to: req.query.to || null,
          },
          fulfilment: {
            orders_by_status: ordersByStatus,
            shipped: shippedCount,
            delivered: deliveredCount,
            cancelled: cancelledCount,
            returned: returnedCount,
          },
          shipments: {
            by_status: shipmentsByStatus,
            total: totalShipments,
            delivered: shipmentsDelivered,
            failed: shipmentsFailed,
            delivery_success_rate_pct: deliverySuccessRate,
          },
          inventory: {
            total_skus: totalSkus,
            total_units_on_hand: totalUnitsOnHand,
            low_stock_skus: lowStockSkus,
            out_of_stock_skus: outOfStockSkus,
          },
          top_adjusted_skus: movementRows.map((r) => {
            const inv = invById.get(r.inventory_id);
            const name = inv
              ? nameBySellable[`${inv.sellable_type}:${inv.sellable_id}`] || inv.sku
              : null;
            return {
              inventory_id: r.inventory_id,
              sku: inv?.sku || null,
              name_ar: name,
              movements: Number(r.movements),
              net_delta: Number(r.net_delta || 0),
              current_on_hand: inv?.on_hand ?? null,
            };
          }),
          adjustments: {
            count: Number(adjustRow?.count || 0),
            net_delta: Number(adjustRow?.net_delta || 0),
          },
        },
      });
    }),
  );

  return router;
}
