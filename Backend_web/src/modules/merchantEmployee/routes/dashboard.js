/**
 * GET /api/merchant-employee/dashboard
 *
 * A condensed operational dashboard for the employee's merchant: today's
 * orders, pending fulfilment queue, and the employee's own recent activity.
 * Scoped to req.merchant.id (the employee's bound merchant).
 */
import { Router } from 'express';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import sequelize from '../../../config/database.js';

export default function createEmployeeDashboardRoutes() {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { Order } = m;
      const merchantId = req.merchant.id;

      // Today window (server local).
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayCount = await Order.count({
        where: {
          merchant_id: merchantId,
          placed_at: { [Op.between]: [startOfDay, endOfDay] },
        },
      });

      // Fulfilment queue: orders waiting on the merchant to act.
      const queue = await Order.findAll({
        where: {
          merchant_id: merchantId,
          status: { [Op.in]: ['paid', 'preparing', 'ready_to_ship'] },
        },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const queueByStatus = {};
      let queueTotal = 0;
      for (const r of queue) {
        queueByStatus[r.status] = Number(r.count);
        queueTotal += Number(r.count);
      }

      res.json({
        ok: true,
        data: {
          merchant_id: merchantId,
          employee: {
            id: req.merchantEmployee.id,
            role: req.merchantEmployee.role,
          },
          kpis: {
            orders_today: todayCount,
            fulfilment_queue: queueTotal,
            queue_by_status: queueByStatus,
          },
        },
      });
    }),
  );

  return router;
}
