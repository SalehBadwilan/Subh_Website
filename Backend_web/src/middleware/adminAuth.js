/**
 * Admin role-based authorization middleware (Stage 3 — Admin APIs).
 *
 * The OTP/JWT auth layer (src/middleware/auth.js) authenticates the USER and
 * attaches `req.user = { id, phone, is_guest }`. It intentionally does NOT carry
 * a role — the same user may hold several roles. This module resolves the admin
 * scoping at request time from the database, mirroring the merchantAuth pattern.
 *
 *   requireAdmin       → resolves whether the authenticated user is an Admin
 *                        (full access) OR an Admin Employee (read-only).
 *                        Rejects non-admin identities (403).
 *                        Attaches `req.adminRole` = 'admin' | 'admin_employee'.
 *                        When Admin Employee, also attaches `req.adminEmployee`.
 *
 *   requireFullAdmin   → blocks Admin Employee (read-only) from write
 *                        operations (POST/PUT/PATCH/DELETE) and returns 403.
 *                        Full Admin passes through untouched.
 *
 * Role resolution strategy:
 *   - Full Admin        → user has the `admin` role slug in user_roles.
 *   - Admin Employee    → user has the `admin_employee` role slug in user_roles
 *                         AND an active AdminEmployee row. This combination
 *                         yields READ-ONLY access to the admin GET endpoints.
 *
 * This keeps the constraint isolated to the admin module — Customer, Merchant
 * and Merchant Employee APIs are completely unaffected.
 */
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const getModels = (req) => req.app?.locals?.models;

/**
 * Resolve the admin role for the authenticated user. Must run AFTER
 * `authenticate()`. Attaches `req.adminRole` (and `req.adminEmployee` when
 * applicable). Rejects anyone who is neither admin nor admin_employee.
 */
export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const models = getModels(req);
  if (!models) throw new ApiError(500, 'models not initialized');

  const { UserRole, Role, AdminEmployee } = models;

  const assignments = await UserRole.findAll({
    where: { user_id: req.user.id },
    include: [{ model: Role, attributes: ['slug'] }],
  });
  const roleSlugs = new Set(
    assignments.map((ur) => ur?.Role?.slug).filter(Boolean),
  );

  const isFullAdmin = roleSlugs.has('admin');
  const isAdminEmployee = roleSlugs.has('admin_employee');

  if (!isFullAdmin && !isAdminEmployee) {
    throw new ApiError(403, 'هذا الإجراء يتطلب صلاحية إدارية', {
      code: 'admin_required',
    });
  }

  if (isFullAdmin) {
    // Full Admin — no further restriction.
    req.adminRole = 'admin';
    return next();
  }

  // Admin Employee — require an ACTIVE AdminEmployee record. Without one (or
  // when deactivated), access is revoked even though the role slug is present.
  const ae = await AdminEmployee.findOne({ where: { user_id: req.user.id } });
  if (!ae || !ae.is_active) {
    throw new ApiError(403, 'حساب موظف الإدارة غير نشط', {
      code: 'admin_employee_inactive',
    });
  }

  req.adminRole = 'admin_employee';
  req.adminEmployee = ae;
  next();
});

/**
 * Block Admin Employee (read-only role) from write operations. No-op for the
 * full Admin. Use on every POST/PUT/PATCH/DELETE handler in the admin module.
 *
 *   router.post('/', requireFullAdmin, handler);
 */
export const requireFullAdmin = asyncHandler(async (req, _res, next) => {
  if (req.adminRole !== 'admin') {
    throw new ApiError(403, 'صلاحية القراءة فقط: الإجراء ممنوع لموظف الإدارة', {
      code: 'forbidden_read_only',
    });
  }
  next();
});

export default { requireAdmin, requireFullAdmin };
