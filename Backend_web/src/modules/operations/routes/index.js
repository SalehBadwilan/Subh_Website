/**
 * Operations API router (Stage 4 — Operations APIs).
 *
 * Mount point: /api/operations
 *
 * Access model:
 *   - Warehouse staff (operations)  every endpoint, full read/write.
 *   - Full Admin                    every endpoint, full read/write (ops is a
 *                                   subset of admin).
 *   - Admin Employee                GET endpoints only (read-only).
 *                                   POST/PATCH → 403 forbidden_read_only.
 *
 * Authorization is layered in two steps:
 *   1. `authenticate()`           — verifies the JWT and attaches req.user.
 *   2. `requireOperations()`      — resolves whether the user is warehouse,
 *                                   full Admin, or an Admin Employee and
 *                                   attaches req.operationsRole. Anyone else
 *                                   is rejected (403) here.
 *
 *   Each WRITE handler additionally runs `requireOperationsWrite()` which
 *   throws 403 when req.operationsRole === 'admin_employee'. This is the
 *   explicit, verifiable gate that keeps Admin Employee strictly read-only
 *   without affecting warehouse staff or the full Admin.
 *
 * The router is mounted with its own base path (/operations) so it never
 * collides with the generic CRUD routers or the Customer/Merchant/MerchantEmployee/
 * Admin APIs.
 */
import { Router } from 'express';

import authenticate from '../../../middleware/auth.js';
import { requireOperations } from '../../../middleware/operationsAuth.js';

import dashboardRoutes from './dashboard.js';
import orderRoutes from './orders.js';
import inventoryRoutes from './inventory.js';
import shipmentRoutes from './shipments.js';
import reportRoutes from './reports.js';
import supportTicketRoutes from './supportTickets.js';

export default function createOperationsRoutes({ models }) {
  const router = Router();

  // Every operations route requires auth + an operations-scoped identity
  // (warehouse staff, full Admin, OR read-only Admin Employee). Sub-routers
  // compose `requireOperationsWrite` on their mutating endpoints, so read-only
  // enforcement is consistent and explicit.
  router.use(authenticate());
  router.use(requireOperations);

  router.use('/dashboard', dashboardRoutes({ models }));
  router.use('/orders', orderRoutes({ models }));
  router.use('/inventory', inventoryRoutes({ models }));
  router.use('/shipments', shipmentRoutes({ models }));
  router.use('/reports', reportRoutes({ models }));
  router.use('/support-tickets', supportTicketRoutes({ models }));

  return router;
}
