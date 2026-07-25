/**
 * Subscription Change Requests (Admin) — Stage 3.
 *
 *   GET  /api/admin/subscription-requests
 *   POST /api/admin/subscription-requests/:id/approve
 *   POST /api/admin/subscription-requests/:id/reject
 *
 * A merchant cannot self-switch plans (payment wiring is out of MVP scope —
 * see src/modules/merchant/routes/subscription.js); they submit a request via
 * POST /api/merchant/subscription/change-request, and Subh reviews it here.
 *
 *   approve → applies the requested plan to the merchant's MerchantSubscription
 *             (updates the existing active row in place, or creates one if the
 *             merchant had none), computes current_period_end from the
 *             REQUESTED plan's own billing_period (monthly/quarterly/yearly —
 *             not a hardcoded month), and marks the request 'applied'.
 *   reject  → marks the request 'rejected' with a reason. No subscription change.
 *
 * Only a request in 'pending' status can be approved/rejected (idempotency —
 * terminal requests return 409 on re-processing, mirroring merchantApplications.js).
 *
 * GET is available to read-only Admin Employees; both POST handlers require
 * full Admin via requireFullAdmin.
 */
import { Router } from 'express';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, notFound, badRequest } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { requireFullAdmin } from '../../../middleware/adminAuth.js';
import sequelize from '../../../config/database.js';

const num = (v) => (v == null ? null : Number(v));

/** Compute a period end date from `now` based on a plan's billing_period. */
function computePeriodEnd(billingPeriod, from = new Date()) {
  const end = new Date(from);
  if (billingPeriod === 'monthly') end.setMonth(end.getMonth() + 1);
  else if (billingPeriod === 'quarterly') end.setMonth(end.getMonth() + 3);
  else end.setFullYear(end.getFullYear() + 1); // yearly (and any unexpected value, safest default)
  return end;
}

export default function createAdminSubscriptionRequestRoutes({ models }) {
  const router = Router();
  const { SubscriptionChangeRequest, Merchant, Plan, MerchantSubscription } = models;

  const serialize = (r) => ({
    id: r.id,
    merchant_id: r.merchant_id,
    merchant: r.Merchant ? { id: r.Merchant.id, commercial_name: r.Merchant.commercial_name } : null,
    current_plan: r.CurrentPlan
      ? { id: r.CurrentPlan.id, slug: r.CurrentPlan.slug, name_ar: r.CurrentPlan.name_ar, billing_period: r.CurrentPlan.billing_period, price_sar: num(r.CurrentPlan.price_sar) }
      : null,
    requested_plan: r.RequestedPlan
      ? { id: r.RequestedPlan.id, slug: r.RequestedPlan.slug, name_ar: r.RequestedPlan.name_ar, billing_period: r.RequestedPlan.billing_period, price_sar: num(r.RequestedPlan.price_sar) }
      : null,
    change_type: r.change_type,
    reason_ar: r.reason_ar,
    status: r.status,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at,
    rejection_reason: r.rejection_reason,
    created_at: r.created_at,
  });

  // `is_active` MUST be selected — the approve handler checks RequestedPlan.is_active,
  // and Sequelize returns `undefined` for any column not in `attributes`, which would
  // make the guard always throw `plan_unavailable` even for active plans.
  const include = [
    { model: Merchant, attributes: ['id', 'commercial_name'] },
    { model: Plan, as: 'CurrentPlan', attributes: ['id', 'slug', 'name_ar', 'billing_period', 'price_sar', 'is_active'] },
    { model: Plan, as: 'RequestedPlan', attributes: ['id', 'slug', 'name_ar', 'billing_period', 'price_sar', 'is_active'] },
  ];

  // --- GET /api/admin/subscription-requests ---------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.status) where.status = req.query.status;

      const { rows, count } = await SubscriptionChangeRequest.findAndCountAll({
        where,
        include,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });
      res.json(paginatedResponse(rows.map(serialize), count, { page, limit }));
    }),
  );

  // --- POST /api/admin/subscription-requests/:id/approve --------------------
  router.post(
    '/:id/approve',
    requireFullAdmin,
    asyncHandler(async (req, res) => {
      const reviewerId = req.user.id;
      const request = await SubscriptionChangeRequest.findByPk(req.params.id, { include });
      if (!request) throw notFound('SubscriptionChangeRequest');

      if (request.status === 'approved' || request.status === 'applied') {
        throw new ApiError(409, 'تم اعتماد هذا الطلب مسبقًا', { code: 'already_approved' });
      }
      if (request.status === 'rejected') {
        throw new ApiError(409, 'لا يمكن اعتماد طلب تم رفضه مسبقًا', { code: 'already_rejected' });
      }

      const plan = request.RequestedPlan;
      if (!plan || !plan.is_active) {
        throw badRequest('الخطة المطلوبة لم تعد متاحة', { code: 'plan_unavailable' });
      }

      await sequelize.transaction(async (t) => {
        const now = new Date();
        const periodEnd = computePeriodEnd(plan.billing_period, now);

        const existingSub = await MerchantSubscription.findOne({
          where: { merchant_id: request.merchant_id, status: 'active' },
          transaction: t,
        });

        if (existingSub) {
          await existingSub.update(
            { plan_id: plan.id, started_at: now, current_period_end: periodEnd, status: 'active' },
            { transaction: t },
          );
        } else {
          await MerchantSubscription.create(
            {
              merchant_id: request.merchant_id,
              plan_id: plan.id,
              status: 'active',
              started_at: now,
              current_period_end: periodEnd,
            },
            { transaction: t },
          );
        }

        await request.update(
          { status: 'applied', reviewed_by: reviewerId, reviewed_at: now, rejection_reason: null },
          { transaction: t },
        );
      });

      res.json({
        ok: true,
        message: 'تم اعتماد طلب تغيير الخطة وتحديث اشتراك التاجر',
        data: { request_id: request.id, status: 'applied' },
      });
    }),
  );

  // --- POST /api/admin/subscription-requests/:id/reject ----------------------
  router.post(
    '/:id/reject',
    requireFullAdmin,
    validate,
    asyncHandler(async (req, res) => {
      const reviewerId = req.user.id;
      const reason = req.body && typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

      const request = await SubscriptionChangeRequest.findByPk(req.params.id);
      if (!request) throw notFound('SubscriptionChangeRequest');

      if (request.status === 'rejected') {
        throw new ApiError(409, 'تم رفض هذا الطلب مسبقًا', { code: 'already_rejected' });
      }
      if (request.status === 'approved' || request.status === 'applied') {
        throw new ApiError(409, 'لا يمكن رفض طلب تم اعتماده مسبقًا', { code: 'already_approved' });
      }

      await request.update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        rejection_reason: reason || 'تم الرفض من قبل الإدارة',
      });

      res.json({
        ok: true,
        message: 'تم رفض طلب تغيير الخطة',
        data: { request_id: request.id, status: 'rejected' },
      });
    }),
  );

  return router;
}
