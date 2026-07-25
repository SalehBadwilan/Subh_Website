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
  requireMerchant,
  requireEmployeePermission,
} from "../../middleware/merchantAuth.js";

export default function createMerchantEmployeeRoutes({ models }) {
  const router = Router();
  const { MerchantEmployee, Role, UserRole, User } = models;
  router.use(authenticate());
router.use(requireMerchant);
router.use(requireEmployeePermission("employees"));
  router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);

  const where = {
    merchant_id: req.merchant.id,
  };

  if (req.query.user_id) {
    where.user_id = req.query.user_id;
  }

  const { rows, count } = await MerchantEmployee.findAndCountAll({
    where,
    limit,
    offset,
  });

  res.json(paginatedResponse(rows, count, { page, limit }));
}));

 router.get('/:id', asyncHandler(async (req, res) => {
  const e = await MerchantEmployee.findOne({
    where: {
      id: req.params.id,
      merchant_id: req.merchant.id,
    },
  });

  if (!e) throw notFound("MerchantEmployee");

  res.json({ ok: true, data: e });
}));

  // POST — accepts EITHER { merchant_id, user_id } OR { merchant_id, phone, ... }.
  // When only a phone is given, the user is resolved or auto-provisioned (they
  // activate on first OTP login), exactly like the merchant-portal flow. The
  // merchant_employee role slug is always granted so login redirects correctly.
  router.post(
    '/',
    [
      
      body('user_id').optional().isUUID(),
      body('phone')
        .optional()
        .custom((v) => isValidPhone(normalizePhone(v)))
        .withMessage('رقم الجوال غير صالح'),
      body('full_name').optional().isString().isLength({ min: 1, max: 150 }),
      body('email').optional().isEmail().normalizeEmail(),
      body('role').isIn(['merchant_owner', 'merchant_manager', 'merchant_staff']),
      body('is_active').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      if (!req.body.user_id && !req.body.phone) {
        throw badRequest('يجب تحديد user_id أو phone', { code: 'missing_identity' });
      }

      // Resolve or provision the user.
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
            full_name: req.body.full_name || 'موظف جديد',
            is_active: true,
            is_guest: false,
          });
        }
      }

      // Duplicate guard within this merchant.
      const dup = await MerchantEmployee.findOne({
        where: {
  merchant_id: req.merchant.id,
  user_id: user.id,
}
      });
      if (dup) {
        throw conflict('هذا المستخدم موظف لدى هذا التاجر بالفعل', {
          code: 'duplicate_employee',
          employee_id: dup.id,
        });
      }

      const e = await MerchantEmployee.create({
        merchant_id: req.merchant.id,
        user_id: user.id,
        role: req.body.role,
        is_active: req.body.is_active !== false,
      });

      // Grant the merchant_employee role slug (scoped to this merchant).
      const role = await Role.findOne({ where: { slug: 'merchant_employee' } });
      if (role) {
        const exists = await UserRole.findOne({
          where: { user_id: user.id, role_id: role.id, merchant_id: req.merchant.id, },
        });
        if (!exists) {
          await UserRole.create({
            user_id: user.id,
            role_id: role.id,
            merchant_id: req.merchant.id,
          });
        }
      }

      res.status(201).json({
        ok: true,
        data: {
          id: e.id,
          merchant_id: e.merchant_id,
          user_id: user.id,
          role: e.role,
          is_active: e.is_active,
          user: { id: user.id, full_name: user.full_name, phone: user.phone, email: user.email },
        },
      });
    }),
  );

 router.put('/:id', [
  body('role')
    .optional()
    .isIn(['merchant_owner', 'merchant_manager', 'merchant_staff']),
  body('is_active')
    .optional()
    .isBoolean(),
], validate, asyncHandler(async (req, res) => {

  const e = await MerchantEmployee.findOne({
    where: {
      id: req.params.id,
      merchant_id: req.merchant.id,
    },
  });

  if (!e) throw notFound("MerchantEmployee");

  await e.update({
    role: req.body.role,
    is_active: req.body.is_active,
  });

  res.json({ ok: true, data: e });

}));

router.delete('/:id', asyncHandler(async (req, res) => {

  const e = await MerchantEmployee.findOne({
    where: {
      id: req.params.id,
      merchant_id: req.merchant.id,
    },
  });

  if (!e) throw notFound("MerchantEmployee");

  const role = await Role.findOne({
    where: { slug: "merchant_employee" },
  });

  if (role) {
    await UserRole.destroy({
      where: {
        user_id: e.user_id,
        role_id: role.id,
        merchant_id: req.merchant.id,
      },
    });
  }

  await e.destroy({
  force: true,
});

  res.json({
    ok: true,
    message: "MerchantEmployee deleted",
  });

}));
return router;
}