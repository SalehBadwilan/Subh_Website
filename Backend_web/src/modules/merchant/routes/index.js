/**
 * Merchant API router (Stage 2).
 *
 * Mount point: /api/merchant
 *
 * All routes require an authenticated user that owns an active Merchant row.
 * The requireMerchant middleware resolves `req.merchant` once and every handler
 * scopes its queries by req.merchant.id — so cross-merchant access is
 * structurally impossible (404 on any foreign id).
 *
 * The router is composed of focused sub-modules, each receiving the injected
 * models, to keep files small and the architecture Modular Monolith-clean.
 */
import { Router } from 'express';

import authenticate from '../../../middleware/auth.js';
import { requireMerchant } from '../../../middleware/merchantAuth.js';

import dashboardRoutes from './dashboard.js';
import productRoutes from './products.js';
import inventoryRoutes from './inventory.js';
import orderRoutes from './orders.js';
import salesRoutes from './sales.js';
import settlementRoutes from './settlements.js';
import subscriptionRoutes from './subscription.js';
import employeeRoutes from './employees.js';
import profileRoutes from './profile.js';

export default function createMerchantRoutes({ models }) {
  const router = Router();

  // Every merchant route requires auth + an active merchant scope.
  router.use(authenticate());
  router.use(requireMerchant);

  // Inject models onto the router so sub-modules can read them without
  // re-importing the singleton (keeps them testable + consistent with the
  // factory pattern used across the codebase).
  router.use((req, _res, next) => {
    req.merchantModels = models;
    next();
  });

  router.use('/dashboard', dashboardRoutes());
  router.use('/products', productRoutes());
  router.use('/inventory', inventoryRoutes());
  router.use('/orders', orderRoutes());
  router.use('/sales-summary', salesRoutes());
  router.use('/settlements', settlementRoutes());
  router.use('/subscription', subscriptionRoutes());
  router.use('/employees', employeeRoutes());
  router.use('/profile', profileRoutes());

  return router;
}
