import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound, badRequest, conflict } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import { normalizePhone, isValidPhone } from '../../services/otpService.js';
import { authenticate } from "../../middleware/auth.js";
import {
  requireAdmin,
  requireFullAdmin,
} from "../../middleware/adminAuth.js";

/**
 * Admin employees (generic CRUD used by the admin portal).
 *
 * Creating an admin employee is the mirror of adding a merchant employee:
 *  1. Resolve or auto-provision the user by phone (OTP-style — they activate on
 *     first login), OR accept an explicit user_id.
 *  2. Create the AdminEmployee row (department + role).
 *  3. Grant the `admin_employee` role slug in user_roles so the frontend
 *     redirects them to /admin-employee and the backend's requireAdmin /
 *     operationsAuth recognises them.
 *
 * Without step 3 an admin employee would log in and be treated as a plain
 * customer (the exact bug being fixed).
 */
export default function createAdminEmployeeRoutes({ models }) {
  const router = Router();
  const { AdminEmployee, User, Role, UserRole } = models;
  router.use(authenticate());
router.use(requireAdmin);

  const DEPARTMENTS = ['management', 'catalog', 'inventory', 'fulfillment', 'finance', 'support'];
  const ROLES = ['admin', 'admin_manager', 'admin_staff', 'warehouse_staff'];

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.department) where.department = req.query.department;
    if (req.query.user_id) where.user_id = req.query.user_id;
    const { rows, count } = await AdminEmployee.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: User, required: false, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));
  router.get(
  "/my-permissions",
  asyncHandler(async (req, res) => {
    const employee = await AdminEmployee.findOne({
      where: {
        user_id: req.user.id,
      },
    });

    if (!employee) {
      throw notFound("AdminEmployee");
    }

    res.json({
  ok: true,
  data: {
    role: req.adminRole,
    permissions: req.adminEmployee.permissions,
  },
});
  }),
);

  router.get('/:id', asyncHandler(async (req, res) => {
    const e = await AdminEmployee.findByPk(req.params.id, {
      include: [{ model: User, required: false, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] }],
    });
    if (!e) throw notFound('AdminEmployee');
    res.json({ ok: true, data: e });
  }));
  

  // POST — accepts EITHER { user_id } OR { phone, full_name?, email? }.
  router.post(
  '/',
  requireFullAdmin,
    [
  body('user_id').optional().isUUID(),
  body('phone')
    .optional()
    .custom((v) => isValidPhone(normalizePhone(v)))
    .withMessage('رقم الجوال غير صالح'),
  body('full_name').optional().isString().isLength({ min: 1, max: 150 }),
  body('email').optional().isEmail().normalizeEmail(),

  body('employeeType')
    .optional()
    .isIn(['admin', 'warehouse']),

  body('department')
  .optional()
  .isIn(DEPARTMENTS)
  .withMessage(`department يجب أن يكون أحد: ${DEPARTMENTS.join(', ')}`),

  body('role').optional().isIn(ROLES),
  body('permissions')
  .optional()
  .isArray(),
],
    validate,
    asyncHandler(async (req, res) => {
      if (!req.body.user_id && !req.body.phone) {
        throw badRequest('يجب تحديد user_id أو phone', { code: 'missing_identity' });
      }

      // 1) Resolve or provision the user.
      let user;
      if (req.body.user_id) {
        user = await User.findByPk(req.body.user_id);
        if (!user) throw notFound('User');
      } else {
        const phone = normalizePhone(req.body.phone);
        const email = req.body.email ? String(req.body.email).toLowerCase() : null;
        user = await User.findOne({ where: { phone } });
        if (!user && email) user = await User.findOne({ where: { email } });
        if (!user) {
          const randomSecret = crypto.randomBytes(24).toString('hex');
          user = await User.create({
            phone,
            email: email || `${phone}@phone.subh.local`,
            password_hash: bcrypt.hashSync(randomSecret, 10),
            full_name: req.body.full_name || 'موظف إدارة جديد',
            is_active: true,
            is_guest: false,
          });
        }
      }

      // Duplicate guard (unique on user_id).
      const isWarehouse = req.body.employeeType === "warehouse";
      console.log("employeeType =", req.body.employeeType);
      const existing = await AdminEmployee.findOne({
  where: { user_id: user.id },
  paranoid: false,
});

if (existing) {
  console.log(existing.toJSON());

  if (existing.deletedAt || existing.deleted_at) {
    await existing.restore();
    console.log("RESTORED");
    const role = await Role.findOne({
  where: {
    slug: isWarehouse ? "warehouse" : "admin_employee",
  },
});

if (role) {
  const has = await UserRole.findOne({
    where: {
      user_id: user.id,
      role_id: role.id,
    },
  });

  if (!has) {
    await UserRole.create({
      user_id: user.id,
      role_id: role.id,
    });
  }
}

    await existing.update({
      department: isWarehouse
        ? "fulfillment"
        : (req.body.department || "management"),
      role: isWarehouse
        ? "warehouse_staff"
        : "admin_staff",
      permissions: req.body.permissions || [],
      is_active: true,
    });
    console.log("UPDATED");

    return res.status(200).json({
      ok: true,
      data: existing,
    });
  }

  throw conflict("هذا المستخدم موظف إدارة بالفعل", {
    code: "duplicate_admin_employee",
    employee_id: existing.id,
  });
}

      // 2) Create the AdminEmployee row.
      const employeeRole =
  req.body.employeeType === 'warehouse'
    ? 'warehouse_staff'
    : 'admin_staff';



const employee = await AdminEmployee.create({
  user_id: user.id,
  department: isWarehouse
    ? 'fulfillment'
    : (req.body.department || 'management'),
  role: isWarehouse
    ? 'warehouse_staff'
    : 'admin_staff',
  permissions: req.body.permissions || [],
  is_active: true,
});

const role = await Role.findOne({
  where: {
    slug: isWarehouse ? 'warehouse' : 'admin_employee',
  },
});



if (role) {
  const has = await UserRole.findOne({
    where: {
      user_id: user.id,
      role_id: role.id,
    },
  });

  if (!has) {
    await UserRole.create({
      user_id: user.id,
      role_id: role.id,
    });
  }
}

      res.status(201).json({
        ok: true,
        data: {
          id: employee.id,
          user_id: user.id,
          department: employee.department,
          role: employee.role,
          permissions: employee.permissions,
          is_active: employee.is_active,
          user: {
            id: user.id,
            full_name: user.full_name,
            phone: user.phone,
            email: user.email,
          },
        },
      });
    }),
  );

  router.put(
  '/:id',
  requireFullAdmin, [
    body('department').optional().isIn(DEPARTMENTS),
    body('role').optional().isIn(ROLES),
    body('is_active').optional().isBoolean(),
  ], validate, asyncHandler(async (req, res) => {
    const e = await AdminEmployee.findByPk(req.params.id);
    if (!e) throw notFound('AdminEmployee');
    await e.update(req.body);
    res.json({ ok: true, data: e });
  }));

  // DELETE — remove the AdminEmployee row AND revoke the admin_employee role.
  router.delete(
  '/:id',
  requireFullAdmin, asyncHandler(async (req, res) => {
    const e = await AdminEmployee.findByPk(req.params.id);
    if (!e) throw notFound('AdminEmployee');
    const userId = e.user_id;
    await e.destroy();
    const role = await Role.findOne({ where: { slug: 'admin_employee' } });
    if (role) {
      await UserRole.destroy({ where: { user_id: userId, role_id: role.id } });
    }
    res.json({ ok: true, message: 'AdminEmployee deleted' });
  }));

  return router;
}
