/**
 * GET /api/operations/dashboard
 *
 * Aggregated operational KPIs for the warehouse / fulfilment team. All counts
 * are platform-wide (not scoped to any merchant). Read-only — Admin Employee
 * can access.
 *
 * Returns: fulfilment-focused metrics — orders awaiting action (paid/preparing/
 * ready_to_ship), shipments in flight, low/out-of-stock SKUs, and recent
 * inventory movements so ops can see the latest stock activity at a glance.
 */
import { Router } from 'express';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import sequelize from '../../../config/database.js';

// Orders operations still needs to act on (everything between paid and
// delivered, excluding terminal cancelled/returned).
const ACTIONABLE_ORDER_STATUSES = ['paid', 'preparing', 'ready_to_ship', 'shipped'];

// Shipments that are not yet delivered — ops must keep these moving.
const IN_FLIGHT_SHIPMENT_STATUSES = [
  'pending',
  'packed',
  'handed_to_carrier',
  'in_transit',
  'out_for_delivery',
];

export default function createOperationsDashboardRoutes({ models }) {
  const router = Router();
  const { Order, Shipment, Inventory, StockMovement } = models;

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      // --- Orders grouped by status (one query) ----------------------------
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
      const actionableOrders = ACTIONABLE_ORDER_STATUSES.reduce(
        (sum, s) => sum + (ordersByStatus[s] || 0),
        0,
      );

      // --- Shipments in flight (not yet delivered) -------------------------
      const shipmentsInFlight = await Shipment.count({
        where: { status: { [Op.in]: IN_FLIGHT_SHIPMENT_STATUSES } },
      });
      const shipmentsDelivered = await Shipment.count({
        where: { status: 'delivered' },
      });
      const shipmentsFailed = await Shipment.count({
        where: { status: { [Op.in]: ['failed_delivery', 'returned'] } },
      });

      // --- Inventory health ------------------------------------------------
      // Low stock: available (on_hand - reserved) <= reorder_threshold AND > 0
      // Out of stock: available <= 0.
      // Computed in JS over a single fetch of all inventory rows (the central
      // warehouse set is small enough for this in v1).
      const inventoryRows = await Inventory.findAll({
        attributes: ['on_hand', 'reserved', 'reorder_threshold'],
        raw: true,
      });
      let totalSkus = inventoryRows.length;
      let lowStockSkus = 0;
      let outOfStockSkus = 0;
      for (const inv of inventoryRows) {
        const available = Math.max(0, (inv.on_hand || 0) - (inv.reserved || 0));
        const threshold = inv.reorder_threshold || 0;
        if (available <= 0) outOfStockSkus += 1;
        else if (available <= threshold) lowStockSkus += 1;
      }

      // --- Recent inventory movements (latest 10) --------------------------
      const recentMovements = await StockMovement.findAll({
        order: [['created_at', 'DESC']],
        limit: 10,
        raw: true,
      });

      res.json({
        ok: true,
        data: {
          orders: {
            total: totalOrders,
            by_status: ordersByStatus,
            actionable: actionableOrders,
          },
          shipments: {
            in_flight: shipmentsInFlight,
            delivered: shipmentsDelivered,
            failed: shipmentsFailed,
          },
          inventory: {
            total_skus: totalSkus,
            low_stock_skus: lowStockSkus,
            out_of_stock_skus: outOfStockSkus,
          },
          recent_movements: recentMovements.map((m) => ({
            id: m.id,
            inventory_id: m.inventory_id,
            type: m.type,
            delta: m.delta,
            reason: m.reason,
            actor_id: m.actor_id,
            created_at: m.created_at,
          })),
        },
      });
    }),
  );

  return router;
}
