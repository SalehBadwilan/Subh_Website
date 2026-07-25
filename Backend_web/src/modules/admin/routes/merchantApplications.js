/**
 * Merchant Applications (Admin) — Stage 3.
 *
 *   GET    /api/admin/merchant-applications
 *   GET    /api/admin/merchant-applications/:id
 *   POST   /api/admin/merchant-applications/:id/approve
 *   POST   /api/admin/merchant-applications/:id/reject
 *
 * The two POST handlers run inside a single transaction because approving /
 * rejecting an application mutates related state atomically:
 *   approve  → mark application approved + create Merchant + grant the user the
 *              `merchant` role + start the merchant's default subscription +
 *              optionally disable other pending applications for the same user
 *              (so a user cannot have two live approvals).
 *   reject   → mark application rejected with reason + reject any other pending
 *              application the user has for the SAME commercial_registration_no
 *              (avoids leaving sibling duplicates in pending forever).
 *
 * Double approve/reject is forbidden — once the application is in a terminal
 * state the endpoint returns 409. The default plan (if any active one exists)
 * is used to seed the subscription; if none exists the merchant is still
 * created without an active subscription.
 *
 * POST/GET are both gated by requireAdmin; POST additionally requires full
 * Admin (Admin Employee is read-only).
 */
import { Router } from 'express';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, notFound, badRequest } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { requireFullAdmin } from '../../../middleware/adminAuth.js';
import sequelize from '../../../config/database.js';
import { serializeApplication } from '../utils/serializers.js';

export default function createAdminApplicationRoutes({ models }) {
  const router = Router();
  const {
    MerchantApplication,
    Merchant,
    User,
    Role,
    UserRole,
    Plan,
    MerchantSubscription,
  } = models;

  /**
   * Build the standard list WHERE clause + ordering. Supports filtering by
   * status and by user_id (useful for support lookups).
   */
  const listWhere = (query) => {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.user_id) where.user_id = query.user_id;
    return where;
  };

  // --- GET /api/admin/merchant-applications --------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const { rows, count } = await MerchantApplication.findAndCountAll({
        where: listWhere(req.query),
        include: [
          { model: User, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });
      res.json(paginatedResponse(rows.map((a) => serializeApplication(a)), count, { page, limit }));
    }),
  );

  // --- GET /api/admin/merchant-applications/:id ----------------------------
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const app = await MerchantApplication.findByPk(req.params.id, {
        include: [{ model: User, attributes: ['id', 'full_name', 'phone', 'email', 'is_active'] }],
      });
      if (!app) throw notFound('MerchantApplication');

      // Surface the already-created merchant (if approved) without leaking IBAN.
      let merchantId = null;
      if (app.status === 'approved') {
        const m = await Merchant.findOne({ where: { user_id: app.user_id } });
        merchantId = m ? m.id : null;
      }

      res.json({ ok: true, data: serializeApplication(app, { merchantId }) });
    }),
  );

  // --- POST /api/admin/merchant-applications/:id/approve -------------------
  router.post(
    '/:id/approve',
    requireFullAdmin,
    asyncHandler(async (req, res) => {
      const reviewerId = req.user.id;
      const app = await MerchantApplication.findByPk(req.params.id);
      if (!app) throw notFound('MerchantApplication');

      // Idempotency guard — terminal applications cannot be re-processed.
      if (app.status === 'approved') {
        throw new ApiError(409, 'تم اعتماد هذا الطلب مسبقًا', { code: 'already_approved' });
      }
      if (app.status === 'rejected') {
        throw new ApiError(409, 'لا يمكن اعتماد طلب تم رفضه مسبقًا', { code: 'already_rejected' });
      }

      const result = await sequelize.transaction(async (t) => {
        // If a Merchant already exists for this user (e.g. a prior approval),
        // surface a conflict instead of creating a duplicate.
        const existing = await Merchant.findOne({
          where: { user_id: app.user_id },
          transaction: t,
        });
        if (existing) {
          throw new ApiError(409, 'يوجد تاجر مرتبط بهذا المستخدم مسبقًا', {
            code: 'merchant_exists',
            merchant_id: existing.id,
          });
        }

        const existingCr = await Merchant.findOne({
  where: {
    commercial_registration_no: app.commercial_registration_no,
  },
  transaction: t,
});

if (existingCr) {
  throw new ApiError(
    409,
    'يوجد تاجر آخر بنفس رقم السجل التجاري',
    {
      code: 'commercial_registration_exists',
    },
  );
}

        // 1) Create the merchant row from the application snapshot.
        const merchant = await Merchant.create(
          {
            user_id: app.user_id,
            status: 'active',
            commercial_name: app.commercial_name,
            commercial_registration_no: app.commercial_registration_no,
            vat_number: app.vat_number,
            iban: app.iban,
            commission_rate: 0.0, // platform default; admin can adjust later.
            approved_at: new Date(),
          },
          { transaction: t },
        );

        // 2) Grant the user the `merchant` role (idempotent per merchant_id).
        const merchantRole = await Role.findOne({ where: { slug: 'merchant' }, transaction: t });
        if (merchantRole) {
          await UserRole.findOrCreate({
            where: { user_id: app.user_id, role_id: merchantRole.id, merchant_id: merchant.id },
            defaults: { user_id: app.user_id, role_id: merchantRole.id, merchant_id: merchant.id },
            transaction: t,
          });
        }

        // 3) Start the merchant's default subscription if an active plan exists.
        const defaultPlan = await Plan.findOne({
          where: { is_active: true },
          order: [['price_sar', 'ASC']],
          transaction: t,
        });
        if (defaultPlan) {
          const now = new Date();
          const periodEnd = new Date(now);
          // Rough period-end based on billing_period; precise billing is out
          // of scope for the admin approval flow.
          if (defaultPlan.billing_period === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
          else if (defaultPlan.billing_period === 'quarterly') periodEnd.setMonth(periodEnd.getMonth() + 3);
          else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

          await MerchantSubscription.create(
            {
              merchant_id: merchant.id,
              plan_id: defaultPlan.id,
              status: 'active',
              started_at: now,
              current_period_end: periodEnd,
            },
            { transaction: t },
          );
        }

        // 4) Mark the application approved + reject any duplicate pending
        // applications for the same user (a user can be a merchant once).
        await app.update(
          {
            status: 'approved',
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
            rejection_reason: null,
          },
          { transaction: t },
        );
        await MerchantApplication.update(
          { status: 'rejected', reviewed_by: reviewerId, reviewed_at: new Date(),
            rejection_reason: 'تم الرفض تلقائيًا لوجود طلب آخر معتمد لنفس المستخدم' },
          {
            where: {
              user_id: app.user_id,
              id: { [Op.ne]: app.id },
              status: { [Op.in]: ['pending', 'under_review'] },
            },
            transaction: t,
          },
        );

        return { merchant };
      });

      res.json({
        ok: true,
        message: 'تم اعتماد طلب التاجر وإنشاء حساب التاجر',
        data: {
          application_id: app.id,
          application_status: 'approved',
          merchant_id: result.merchant.id,
          merchant_status: result.merchant.status,
        },
      });
    }),
  );

  // --- POST /api/admin/merchant-applications/:id/reject --------------------
  router.post(
    '/:id/reject',
    requireFullAdmin,
    [
      // reason_ar is optional in body but recommended.
      // express-validator import here keeps the validation story consistent.
    ],
    validate,
    asyncHandler(async (req, res) => {
      const reviewerId = req.user.id;
      const reason = req.body && typeof req.body.reason === 'string'
        ? req.body.reason.trim()
        : '';

      const app = await MerchantApplication.findByPk(req.params.id);
      if (!app) throw notFound('MerchantApplication');

      if (app.status === 'rejected') {
        throw new ApiError(409, 'تم رفض هذا الطلب مسبقًا', { code: 'already_rejected' });
      }
      if (app.status === 'approved') {
        throw new ApiError(409, 'لا يمكن رفض طلب تم اعتماده مسبقًا', { code: 'already_approved' });
      }

      await sequelize.transaction(async (t) => {
        // Mark the target application rejected with a reason.
        await app.update(
          {
            status: 'rejected',
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
            rejection_reason: reason || 'تم الرفض من قبل الإدارة',
          },
          { transaction: t },
        );

        // When rejecting, also reject any sibling pending application for the
        // same commercial_registration_no — these are duplicates and should not
        // remain in the queue after a human decision on the same business.
        if (app.commercial_registration_no) {
          await MerchantApplication.update(
            {
              status: 'rejected',
              reviewed_by: reviewerId,
              reviewed_at: new Date(),
              rejection_reason: 'تم الرفض تلقائيًا (طلب مكرر لنفس السجل التجاري)',
            },
            {
              where: {
                commercial_registration_no: app.commercial_registration_no,
                id: { [Op.ne]: app.id },
                status: { [Op.in]: ['pending', 'under_review'] },
              },
              transaction: t,
            },
          );
        }
      });

      res.json({
        ok: true,
        message: 'تم رفض طلب التاجر',
        data: {
          application_id: app.id,
          application_status: 'rejected',
        },
      });
    }),
  );

  return router;
}
