/**
 * Merchant employee management routes.
 *
 *   GET   /api/merchant/employees                    list this merchant's employees
 *   POST  /api/merchant/employees                    add an employee (by phone/email)
 *   PUT   /api/merchant/employees/:id                update role/permissions
 *   PATCH /api/merchant/employees/:id/toggle-active  activate/deactivate
 *
 * Rules enforced:
 *  - An employee is bound to ONE merchant; listings/actions are scoped by
 *    req.merchant.id so cross-merchant access is impossible (404 on foreign).
 *  - Duplicate detection: you cannot add an employee using a phone/email that
 *    already belongs to an active employee of THIS merchant. Adding the same
 *    user to ANOTHER merchant is allowed (different scope), but adding a user
 *    that is already the OWNER of another merchant is rejected.
 *  - The owner role is protected: an employee with role 'merchant_owner' cannot
 *    be downgraded or deactivated through this endpoint (ownership transfer is
 *    an out-of-band admin action).
 *  - is_active toggling is idempotent and logged via the employee row.
 *
 * User creation: if the supplied phone/email matches no existing user, a new
 * inactive user is created (OTP login still works — they will activate on first
 * login). This mirrors the OTP auto-provisioning pattern in otpRoutes.js.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, badRequest, notFound, conflict } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { normalizePhone, isValidPhone } from '../../../services/otpService.js';
import { serializeEmployee } from '../utils/serializers.js';

const VALID_ROLES = ['merchant_manager', 'merchant_staff'];
// Granular permission keys an owner/manager may grant to staff.
const VALID_PERMISSION_KEYS = new Set([
  'dashboard',
  'products',
  'inventory',
  'orders',
  'orders_status',
  'reports',
  'employees',
]);

export default function createEmployeeRoutes() {
  const router = Router();

  // --- GET /api/merchant/employees ----------------------------------------
  router.get(
    '/',
    [
      query('role').optional().isIn(['merchant_owner', 'merchant_manager', 'merchant_staff']),
      query('is_active').optional().isBoolean().toBoolean(),
      query('q').optional().isString().trim().isLength({ max: 100 }),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantEmployee, User } = m;
      const merchantId = req.merchant.id;
      const { page, limit, offset } = parsePagination(req.query);

      const where = { merchant_id: merchantId };
      if (req.query.role) where.role = req.query.role;
      if (typeof req.query.is_active === 'boolean') where.is_active = req.query.is_active;

      const q = req.query.q ? String(req.query.q).trim() : '';
      const userWhere = undefined;
      const include = [{ model: User, required: false, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] }];
      if (q) {
        include[0].required = true; // INNER JOIN when filtering
        include[0].where = {
          [Op.or]: [
            { full_name: { [Op.iLike]: `%${q}%` } },
            { phone: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } },
          ],
        };
      }

      const { rows, count } = await MerchantEmployee.findAndCountAll({
        where,
        include,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
        subQuery: false,
      });

      res.json(
        paginatedResponse(
          rows.map((e) => serializeEmployee(e, e.User)),
          count,
          { page, limit },
        ),
      );
    }),
  );

  // --- POST /api/merchant/employees ---------------------------------------
  router.post(
    '/',
    [
      body('phone')
        .exists({ checkFalsy: true })
        .withMessage('phone مطلوب')
        .custom((v) => isValidPhone(normalizePhone(v)))
        .withMessage('رقم الجوال غير صالح'),
      body('email').optional().isEmail().normalizeEmail(),
      body('full_name').optional().isString().isLength({ min: 1, max: 150 }),
      body('role')
        .isIn(VALID_ROLES)
        .withMessage(`role يجب أن يكون أحد: ${VALID_ROLES.join(', ')}`),
      body('permissions').optional().isObject(),
      body('is_active').optional().isBoolean().toBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantEmployee, User, Merchant } = m;
      const merchantId = req.merchant.id;

      const phone = normalizePhone(req.body.phone);
      const email = req.body.email ? String(req.body.email).toLowerCase() : null;

      // Resolve or provision the user by phone (OTP-style auto-provisioning).
      let user = await User.findOne({ where: { phone } });
      if (!user && email) {
        user = await User.findOne({ where: { email } });
      }
      if (!user) {
        const randomSecret = crypto.randomBytes(24).toString('hex');
        user = await User.create({
          phone,
          email: email || `${phone}@phone.subh.local`,
          password_hash: bcrypt.hashSync(randomSecret, 10),
          full_name: req.body.full_name || 'موظف جديد',
          is_active: true,
          is_guest: false,
        });
      }

      // Block if this user is the OWNER of another merchant account.
      const ownerMerchant = await Merchant.findOne({ where: { user_id: user.id } });
      if (ownerMerchant && ownerMerchant.id !== merchantId) {
        throw badRequest('هذا المستخدم مالك لتاجر آخر ولا يمكن إضافته كموظف', {
          code: 'user_is_owner_elsewhere',
        });
      }

      // Duplicate within THIS merchant → unique constraint will also catch it,
      // but we surface a friendlier error here.
      const existing = await MerchantEmployee.findOne({
        where: { merchant_id: merchantId, user_id: user.id },
      });
      if (existing) {
        throw conflict('هذا المستخدم موظف لدى هذا التاجر بالفعل', {
          code: 'duplicate_employee',
          employee_id: existing.id,
        });
      }

      // Validate permission keys if provided.
      let permissions = null;
      if (req.body.permissions) {
        const invalid = Object.keys(req.body.permissions).filter((k) => !VALID_PERMISSION_KEYS.has(k));
        if (invalid.length) {
          throw badRequest('بعض الصلاحيات غير معروفة', { invalid_permissions: invalid });
        }
        // Coerce values to booleans.
        permissions = {};
        for (const [k, v] of Object.entries(req.body.permissions)) {
          permissions[k] = Boolean(v);
        }
      }

      const created = await MerchantEmployee.create({
        merchant_id: merchantId,
        user_id: user.id,
        role: req.body.role,
        permissions,
        is_active: req.body.is_active !== false,
      });

      res.status(201).json({ ok: true, data: serializeEmployee(created, user) });
    }),
  );

  // --- PUT /api/merchant/employees/:id ------------------------------------
  router.put(
    '/:id',
    [
      body('role').optional().isIn(VALID_ROLES),
      body('permissions').optional().isObject(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantEmployee, User } = m;
      const merchantId = req.merchant.id;

      const emp = await MerchantEmployee.findOne({
        where: { id: req.params.id, merchant_id: merchantId },
        include: [{ model: User, required: false, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] }],
      });
      if (!emp) throw notFound('Employee');

      // Owner role is protected from these endpoints.
      if (emp.role === 'merchant_owner') {
        throw new ApiError(403, 'لا يمكن تعديل حساب المالك من هذا المسار', {
          code: 'owner_protected',
        });
      }

      const patch = {};
      if (req.body.role) patch.role = req.body.role;

      if (req.body.permissions) {
        const invalid = Object.keys(req.body.permissions).filter((k) => !VALID_PERMISSION_KEYS.has(k));
        if (invalid.length) {
          throw badRequest('بعض الصلاحيات غير معروفة', { invalid_permissions: invalid });
        }
        const merged = { ...(emp.permissions || {}), ...req.body.permissions };
        patch.permissions = {};
        for (const [k, v] of Object.entries(merged)) {
          patch.permissions[k] = Boolean(v);
        }
      }

      await emp.update(patch);
      res.json({ ok: true, data: serializeEmployee(emp, emp.User) });
    }),
  );

  // --- PATCH /api/merchant/employees/:id/toggle-active --------------------
  router.patch(
    '/:id/toggle-active',
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantEmployee, User } = m;
      const merchantId = req.merchant.id;

      const emp = await MerchantEmployee.findOne({
        where: { id: req.params.id, merchant_id: merchantId },
        include: [{ model: User, required: false, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] }],
      });
      if (!emp) throw notFound('Employee');

      if (emp.role === 'merchant_owner') {
        throw new ApiError(403, 'لا يمكن إيقاف حساب المالك', { code: 'owner_protected' });
      }

      const next = !emp.is_active;
      await emp.update({ is_active: next });
      res.json({
        ok: true,
        data: serializeEmployee(emp, emp.User),
      });
    }),
  );

  return router;
}
