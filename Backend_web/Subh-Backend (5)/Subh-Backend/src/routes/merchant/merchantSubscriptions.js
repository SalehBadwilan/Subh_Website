import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import { authenticate } from "../../middleware/auth.js";
import {
  requireMerchant,
} from "../../middleware/merchantAuth.js";

export default function createMerchantSubscriptionRoutes({ models }) {
  const router = Router();
  const { MerchantSubscription } = models;
  router.use(authenticate());
router.use(requireMerchant);

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {
  merchant_id: req.merchant.id,
};

if (req.query.status) {
  where.status = req.query.status;
}
    
    const { rows, count } = await MerchantSubscription.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const s = await MerchantSubscription.findOne({
  where: {
    id: req.params.id,
    merchant_id: req.merchant.id,
  },
});
    if (!s) throw notFound('MerchantSubscription');
    res.json({ ok: true, data: s });
  }));

  router.post('/', [
    
    body('plan_id').isUUID(),
    body('started_at').isISO8601(),
    body('current_period_end').isISO8601(),
    body('external_reference').optional().isString(),
    body('status').optional().isIn(['active', 'past_due', 'cancelled', 'expired']),
  ], validate, asyncHandler(async (req, res) => {
    await MerchantSubscription.update(
  { status: "expired" },
  {
    where: {
      merchant_id: req.merchant.id,
      status: "active",
    },
  }
);
    const s = await MerchantSubscription.create({
  ...req.body,
  merchant_id: req.merchant.id,
});

res.status(201).json({
  ok: true,
  data: s,
});
}));

  router.put('/:id', [
    body('status').optional().isIn(['active', 'past_due', 'cancelled', 'expired']),
    body('current_period_end').optional().isISO8601(),
  ], validate, asyncHandler(async (req, res) => {
    const s = await MerchantSubscription.findOne({
  where: {
    id: req.params.id,
    merchant_id: req.merchant.id,
  },
});
    if (!s) throw notFound('MerchantSubscription');
    await s.update(req.body);
    res.json({ ok: true, data: s });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const deleted = await MerchantSubscription.destroy({
  where: {
    id: req.params.id,
    merchant_id: req.merchant.id,
  },
});
    if (!deleted) throw notFound('MerchantSubscription');
    res.json({ ok: true, message: 'MerchantSubscription deleted' });
  }));

  return router;
}