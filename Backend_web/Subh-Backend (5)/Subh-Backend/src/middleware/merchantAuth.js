/**
 * Merchant role-based authorization middleware (Stage 2).
 *
 * The OTP/JWT auth layer (src/middleware/auth.js) authenticates the USER and
 * attaches `req.user = { id, phone, is_guest }`. It intentionally does NOT carry
 * a role — the same user may have multiple roles (e.g. customer AND merchant).
 *
 * This module resolves the merchant scoping at request time from the database:
 *
 *   requireMerchant         → resolves the active Merchant row for req.user.id
 *                             and attaches `req.merchant`. Rejects suspended /
 *                             terminated merchants or non-merchants (403).
 *                             Every downstream query is scoped to
 *                             req.merchant.id — so a merchant can NEVER reach
 *                             another merchant's data (404 on attempt).
 *
 *   requireMerchantEmployee → resolves the MerchantEmployee row for req.user.id,
 *                             attaches `req.merchantEmployee` + `req.merchant`.
 *                             Enforces is_active + that the linked merchant is
 *                             active. A merchant employee is pinned to ONE
 *                             merchant and can never cross into another.
 *
 *   requireEmployeePermission(key)
 *                          → checks the employee's granular permissions bitmask
 *                             (stored as JSONB on merchant_employees.permissions).
 *                             Falls back to role-based defaults so a newly added
 *                             employee with no explicit permissions still works.
 *
 * Permission keys (granular, MVP set):
 *   dashboard, products, inventory, orders, orders_status, reports, employees
 *
 *   Merchant OWNER bypasses all employee-permission checks (full access).
 *   Merchant MANAGER bypasses all except employee management.
 */
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Resolve the merchant for the authenticated user, attach it to req.merchant.
 * Reuse the models injected into the router factory via res.app.locals when the
 * route was registered with { models } — but middleware here is invoked per
 * request, so we read models off req.app.locals (set by bootApp).
 */
const getModels = (req) => req.app?.locals?.models;
if (!getModels) {
  // sanity guard — never expected at runtime
  console.warn('[merchantAuth] req.app.locals.models not available');
}

/**
 * Default permission matrix by merchant-employee role. Used when an employee's
 * JSONB `permissions` field is null/absent. Keys mirror the requireEmployeePermission
 * keys used across the merchant-employee routes.
 */
const DEFAULT_EMPLOYEE_PERMISSIONS = {
  merchant_owner: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    orders_status: true,
    reports: true,
    employees: true,
  },
  merchant_manager: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    orders_status: true,
    reports: true,
    employees: false,
  },
  merchant_staff: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    orders_status: true,
    reports: false,
    employees: false,
  },
};

/**
 * Resolve an employee's effective permissions: explicit JSONB overrides the
 * role default per key, otherwise the role default applies.
 */
export function resolveEmployeePermissions(employee) {
  const base = DEFAULT_EMPLOYEE_PERMISSIONS[employee.role] || {};
  const explicit = employee.permissions && typeof employee.permissions === 'object'
    ? employee.permissions
    : {};
  return { ...base, ...explicit };
}

/**
 * Resolve the active Merchant owned by the authenticated user.
 * Attaches req.merchant. Throws 403 if the user is not a merchant or is suspended.
 */
export const requireMerchant = asyncHandler(async (req, _res, next) => {
  const models = getModels(req);
  if (!models) throw new ApiError(500, 'models not initialized');

  const merchant = await models.Merchant.findOne({
    where: { user_id: req.user.id },
  });

  if (!merchant) {
    throw new ApiError(403, 'هذا الحساب ليس تاجرًا', { code: 'not_merchant' });
  }
  if (merchant.status === 'suspended') {
    throw new ApiError(403, 'حساب التاجر موقوف', { code: 'merchant_suspended' });
  }
  if (merchant.status === 'terminated') {
    throw new ApiError(403, 'حساب التاجر ملغى', { code: 'merchant_terminated' });
  }

  req.merchant = merchant;
  next();
});

/**
 * Resolve the MerchantEmployee row for the authenticated user + its merchant.
 * Attaches req.merchantEmployee + req.merchant. Enforces:
 *   - employee exists and is_active
 *   - linked merchant is active (not suspended/terminated)
 * A merchant employee is bound to exactly one merchant_id and every downstream
 * query must filter by req.merchant.id, so cross-merchant access is impossible.
 */
export const requireMerchantEmployee = asyncHandler(async (req, _res, next) => {
  const models = getModels(req);
  if (!models) throw new ApiError(500, 'models not initialized');

  const employee = await models.MerchantEmployee.findOne({
    where: { user_id: req.user.id },
  });

  if (!employee) {
    throw new ApiError(403, 'هذا الحساب ليس موظف تاجر', { code: 'not_merchant_employee' });
  }
  if (!employee.is_active) {
    throw new ApiError(403, 'حساب الموظف غير نشط', { code: 'employee_inactive' });
  }

  const merchant = await models.Merchant.findByPk(employee.merchant_id);
  if (!merchant || merchant.status === 'terminated') {
    throw new ApiError(403, 'التاجر المرتبط غير متاح', { code: 'merchant_unavailable' });
  }
  if (merchant.status === 'suspended') {
    throw new ApiError(403, 'حساب التاجر موقوف', { code: 'merchant_suspended' });
  }

  req.merchantEmployee = employee;
  req.merchant = merchant;
  next();
});

/**
 * Require a specific employee permission key. Must run AFTER requireMerchantEmployee.
 * Owners bypass. Managers bypass unless the key is `employees`.
 */
export const requireEmployeePermission = (key) =>
  asyncHandler(async (req, _res, next) => {
    const emp = req.merchantEmployee;

// إذا كان المستخدم صاحب المتجر (وليس موظفًا)
// فإن requireMerchant سبق أن تحقق من ذلك، لذا اسمح له.
if (!emp && req.merchant) {
  return next();
}

if (!emp) {
  throw new ApiError(
    500,
    "requireEmployeePermission used without requireMerchantEmployee"
  );
}
    // Owner has full access.
    if (emp.role === 'merchant_owner') return next();
    // Manager has full access except employee management.
    if (emp.role === 'merchant_manager' && key !== 'employees') return next();

    const perms = resolveEmployeePermissions(emp);
    if (!perms[key]) {
      throw new ApiError(403, 'لا تملك الصلاحية لهذا الإجراء', {
        code: 'forbidden',
        required_permission: key,
      });
    }
    next();
  });

export default { requireMerchant, requireMerchantEmployee, requireEmployeePermission };
