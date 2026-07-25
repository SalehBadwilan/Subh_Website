/**
 * Merchant Employee API router (Stage 2).
 *
 * Mount point: /api/merchant-employee
 *
 * All routes require an authenticated user that is an ACTIVE MerchantEmployee.
 * The requireMerchantEmployee middleware resolves `req.merchantEmployee` AND
 * `req.merchant` (the linked merchant) once, so every handler is scoped to
 * req.merchant.id — the employee can ONLY see/operate on their own merchant's
 * data. Cross-merchant access is structurally impossible.
 *
 * Per-endpoint permission gating uses requireEmployeePermission(key), which
 * checks the employee's granular permissions (or the role default). Owners have
 * full access; managers have full access except employee management (which is
 * not exposed on this router anyway).
 */
import { Router } from 'express';

import authenticate from '../../../middleware/auth.js';
import {
  requireMerchantEmployee,
  requireEmployeePermission,
} from '../../../middleware/merchantAuth.js';

import dashboardRoutes from './dashboard.js';
import productRoutes from './products.js';
import inventoryRoutes from './inventory.js';
import orderRoutes from './orders.js';
import reportRoutes from './reports.js';

export default function createMerchantEmployeeRoutes({ models }) {
  const router = Router();

  router.use(authenticate());
  router.use(requireMerchantEmployee);

  // Inject models onto the request for sub-modules.
  router.use((req, _res, next) => {
    req.merchantModels = models;
    next();
  });

  router.use('/dashboard', requireEmployeePermission('dashboard'), dashboardRoutes());
  router.use('/products', requireEmployeePermission('products'), productRoutes());
  router.use('/inventory', requireEmployeePermission('inventory'), inventoryRoutes());
  router.use('/orders', requireEmployeePermission('orders'), orderRoutes());
  router.use('/reports', requireEmployeePermission('reports'), reportRoutes());

  return router;
}
