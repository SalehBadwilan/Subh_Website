/**
 * Operations role-based authorization middleware (Stage 4 — Operations APIs).
 *
 * The OTP/JWT auth layer (src/middleware/auth.js) authenticates the USER and
 * attaches `req.user = { id, phone, is_guest }`. It intentionally does NOT carry
 * a role — the same user may hold several roles. This module resolves the
 * operations scoping at request time from the database, mirroring the adminAuth
 * pattern so the constraint stays isolated to the operations module.
 *
 *   requireOperations       → resolves whether the authenticated user is allowed
 *                             to access the Operations module:
 *                               - warehouse staff (the canonical Operations role)
 *                               - full Admin (operations is a subset of admin)
 *                               - Admin Employee (read-only)
 *                             Rejects everyone else (403).
 *                             Attaches `req.operationsRole` =
 *                               'operations' | 'admin' | 'admin_employee'.
 *
 *   requireOperationsWrite  → blocks read-only roles from write operations
 *                             (POST/PUT/PATCH/DELETE) and returns 403.
 *                             Warehouse staff + full Admin pass through.
 *
 * Role resolution strategy:
 *   - warehouse         → user has the `warehouse` role slug in user_roles. This
 *                         is the Operations staff role (inventory:adjust,
 *                         fulfillment:write, orders:read) seeded in RBAC.
 *   - admin             → user has the `admin` role slug. Full access.
 *   - admin_employee    → user has the `admin_employee` role slug AND an active
 *                         AdminEmployee row. READ-ONLY access to operations GET
 *                         endpoints.
 *
 * This keeps Customer, Merchant, Admin and AI APIs completely unaffected.
 */
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const getModels = (req) => req.app?.locals?.models;

/**
 * Resolve the operations role for the authenticated user. Must run AFTER
 * `authenticate()`. Attaches `req.operationsRole` (and `req.adminEmployee` when
 * applicable). Rejects anyone who is neither warehouse, admin, nor admin_employee.
 */
export const requireOperations = asyncHandler(async (req, _res, next) => {
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

  const isWarehouse = roleSlugs.has('warehouse');
  const isFullAdmin = roleSlugs.has('admin');
  const isAdminEmployee = roleSlugs.has('admin_employee');

  if (!isWarehouse && !isFullAdmin && !isAdminEmployee) {
    throw new ApiError(403, 'هذا الإجراء يتطلب صلاحية عمليات', {
      code: 'operations_required',
    });
  }

  if (isWarehouse) {
    // Warehouse staff — the canonical Operations role. Read + write.
    req.operationsRole = 'operations';
    return next();
  }

  if (isFullAdmin) {
    // Full Admin — operations is a subset of admin, so full access.
    req.operationsRole = 'admin';
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

  req.operationsRole = 'admin_employee';
  req.adminEmployee = ae;
  next();
});

/**
 * Block read-only roles from write operations. No-op for warehouse staff and
 * the full Admin. Use on every mutating endpoint (POST/PATCH) in the operations
 * module — i.e. inventory adjustment and order status changes.
 *
 *   router.post('/inventory/:id/adjust', requireOperationsWrite, handler);
 */
export const requireOperationsWrite = asyncHandler(async (req, _res, next) => {
  if (req.operationsRole === 'admin_employee') {
    throw new ApiError(403, 'صلاحية القراءة فقط: الإجراء ممنوع لموظف الإدارة', {
      code: 'forbidden_read_only',
    });
  }
  next();
});

export default { requireOperations, requireOperationsWrite };
