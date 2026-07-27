/**
 * Admin API router (Stage 3 — Admin APIs).
 *
 * Mount point: /api/admin
 *
 * Access model:
 *   - Full Admin        every endpoint, full read/write.
 *   - Admin Employee    GET endpoints only (read-only).
 *                        POST/PUT/PATCH/DELETE → 403 forbidden_read_only.
 *
 * Authorization is layered in two steps:
 *   1. `authenticate()`        — verifies the JWT and attaches req.user.
 *   2. `requireAdmin()`        — resolves whether the user is a full Admin or
 *                                an Admin Employee and attaches req.adminRole.
 *                                Non-admin identities are rejected (403) here.
 *
 *   Each WRITE handler additionally runs `requireFullAdmin()` which throws 403
 *   when req.adminRole !== 'admin'. This is the explicit, verifiable gate that
 *   keeps Admin Employee strictly read-only without affecting full Admin.
 *
 * The router is mounted with its own base path (/admin) so it never collides
 * with the generic CRUD routers or the Customer/Merchant/MerchantEmployee APIs.
 */
import { Router } from 'express';

import authenticate from '../../../middleware/auth.js';
import { requireAdmin } from '../../../middleware/adminAuth.js';

import dashboardRoutes from './dashboard.js';
import applicationRoutes from './merchantApplications.js';
import merchantRoutes from './merchants.js';
import productRoutes from './products.js';
import categoryRoutes from './categories.js';
import packageRoutes from './packages.js';
import userRoutes from './users.js';
import reportRoutes from './reports.js';
import settingRoutes from './settings.js';

export default function createAdminRoutes({ models }) {
  const router = Router();

  // Every admin route requires auth + an admin-scoped identity (full Admin OR
  // read-only Admin Employee). Sub-routers compose `requireFullAdmin` on their
  // mutating endpoints, so read-only enforcement is consistent and explicit.
  router.use(authenticate());
  router.use(requireAdmin);

  router.use('/dashboard', dashboardRoutes({ models }));
  router.use('/merchant-applications', applicationRoutes({ models }));
  router.use('/merchants', merchantRoutes({ models }));
  router.use('/products', productRoutes({ models }));
  router.use('/categories', categoryRoutes({ models }));
  router.use('/packages', packageRoutes({ models }));
  router.use('/users', userRoutes({ models }));
  router.use('/reports', reportRoutes({ models }));
  router.use('/settings', settingRoutes({ models }));

  return router;
}
