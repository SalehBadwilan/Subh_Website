/**
 * Merchant subscription routes.
 *
 *   GET  /api/merchant/subscription
 *        The merchant's active subscription + plan details. Read-only.
 *
 *   POST /api/merchant/subscription/change-request
 *        Request a plan change. The merchant cannot self-switch (payment
 *        wiring is out of MVP scope) — it submits a request that Subh reviews
 *        and applies. One active (pending/approved) request per merchant.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, badRequest, notFound } from '../../../utils/ApiError.js';
import validate from '../../../middleware/validate.js';
import { serializeSubscription, serializePlanChangeRequest } from '../utils/serializers.js';

export default function createSubscriptionRoutes() {
  const router = Router();

  // --- GET /api/merchant/subscription -------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantSubscription, Plan, SubscriptionChangeRequest } = m;
      const merchantId = req.merchant.id;

      const sub = await MerchantSubscription.findOne({
        where: { merchant_id: merchantId, status: 'active' },
        include: [{ model: Plan }],
      });

      let plan = sub?.Plan;
      // Fallback: if no active subscription row, expose available plans so the
      // merchant can still request one. (Subh may seed merchants without a row.)
      let availablePlans = null;
      if (!plan) {
        availablePlans = await Plan.findAll({
          where: { is_active: true },
          attributes: ['id', 'slug', 'name_ar', 'billing_period', 'price_sar', 'features'],
          order: [['price_sar', 'ASC']],
        });
      }

      // Pending change request (if any) for visibility.
      const pending = await SubscriptionChangeRequest.findOne({
        where: { merchant_id: merchantId, status: { [Op.in]: ['pending', 'approved'] } },
        include: [
          { model: Plan, as: 'CurrentPlan' },
          { model: Plan, as: 'RequestedPlan' },
        ],
        order: [['created_at', 'DESC']],
      });

      res.json({
        ok: true,
        data: {
          ...serializeSubscription(sub, plan),
          pending_change_request: pending ? serializePlanChangeRequest(pending) : null,
          available_plans: availablePlans,
        },
      });
    }),
  );

  // --- POST /api/merchant/subscription/change-request ---------------------
  router.post(
    '/change-request',
    [
      body('requested_plan_id').isUUID().withMessage('requested_plan_id مطلوب وصالح'),
      body('change_type')
        .optional()
        .isIn(['upgrade', 'downgrade', 'change_period']),
      body('reason_ar').optional().isString().isLength({ max: 2000 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantSubscription, Plan, SubscriptionChangeRequest } = m;
      const merchantId = req.merchant.id;

      const requestedPlan = await Plan.findByPk(req.body.requested_plan_id);
      if (!requestedPlan || !requestedPlan.is_active) {
        throw notFound('Plan');
      }

      // Resolve current plan (may be null if no active subscription).
      const sub = await MerchantSubscription.findOne({
        where: { merchant_id: merchantId, status: 'active' },
      });
      const currentPlanId = sub?.plan_id || null;

      // Same-plan request is meaningless.
      if (currentPlanId && currentPlanId === requestedPlan.id) {
        throw badRequest('الخطة المطلوبة هي نفس الخطة الحالية');
      }

      // One active request at a time.
      const existing = await SubscriptionChangeRequest.findOne({
        where: {
          merchant_id: merchantId,
          status: { [Op.in]: ['pending', 'approved'] },
        },
      });
      if (existing) {
        throw new ApiError(409, 'يوجد طلب تغيير خطة قيد المراجعة بالفعل', {
          code: 'pending_change_exists',
          request_id: existing.id,
        });
      }

      const created = await SubscriptionChangeRequest.create({
        merchant_id: merchantId,
        current_plan_id: currentPlanId,
        requested_plan_id: requestedPlan.id,
        change_type: req.body.change_type || 'change_period',
        reason_ar: req.body.reason_ar || null,
        status: 'pending',
        requested_by: req.user.id,
      });

      res.status(201).json({ ok: true, data: serializePlanChangeRequest(created) });
    }),
  );

  return router;
}
