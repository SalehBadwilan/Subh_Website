import { Router } from 'express';
import { Op } from 'sequelize';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound, badRequest } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import authenticate from '../../middleware/auth.js';

export default function createMerchantApplicationRoutes({ models }) {
  const router = Router();
  const { MerchantApplication } = models;
  router.use(authenticate());

  /**
   * Decide the owning user_id for a create/submit request:
   *  - If a valid customer JWT is presented, the application is bound to that
   *    user (req.user.id) — this is the Customer APIs path.
   *  - Otherwise fall back to an explicit user_id in the body, preserving the
   *    original admin/tooling contract. Either source must yield a UUID.
   */

  router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);

  const where = {
    user_id: req.user.id,
  };

  if (req.query.status) {
    where.status = req.query.status;
  }

  const { rows, count } = await MerchantApplication.findAndCountAll({
    where,
    limit,
    offset,
  });

  res.json(paginatedResponse(rows, count, { page, limit }));
}));
  router.get('/:id', asyncHandler(async (req, res) => {
    const a = await MerchantApplication.findOne({
  where: {
    id: req.params.id,
    user_id: req.user.id,
  },
});
    if (!a) throw notFound('MerchantApplication');
    res.json({ ok: true, data: a });
  }));

  router.post('/', [
    // user_id is optional in the body: when a customer JWT is present we use
    // the authenticated identity and ignore any body value (so it can't be
    // spoofed). Admins without a customer token may still submit on behalf of
    // a user by passing user_id.
    body('user_id').optional().isUUID(),
    body('commercial_name').isString().isLength({ min: 1, max: 150 }),
    body('commercial_registration_no').isString().isLength({ min: 1, max: 50 }),
    body('iban').isString().isLength({ min: 1, max: 34 }),
    body('vat_number').optional().isString(),
    body('notes').optional().isString(),
  ], validate,asyncHandler(async (req, res) => {
    // Prefer the authenticated user; fall back to an explicit user_id only
    // when no auth was provided (preserves the original admin contract).
    const userId = req.user ? req.user.id : req.body.user_id;
    if (!userId) {
      throw badRequest('user_id مطلوب أو يجب تسجيل الدخول');
    }
    const existing = await MerchantApplication.findOne({
  where: {
    user_id: userId,
    status: {
      [Op.in]: ["pending", "under_review"],
    },
  },
});

if (existing) {
  return res.status(409).json({
    ok: false,
    message: "لديك طلب قيد المراجعة بالفعل.",
    data: existing,
  });
}
    const a = await MerchantApplication.create({
      user_id: userId,
      commercial_name: req.body.commercial_name,
      commercial_registration_no: req.body.commercial_registration_no,
      vat_number: req.body.vat_number,
      iban: req.body.iban,
      notes: req.body.notes,
      status: 'pending',
    });
    res.status(201).json({ ok: true, data: a });
  }));

  // Limited update: only status transitions + review fields.
  router.put('/:id', [
    body('status').optional().isIn(['pending', 'under_review', 'approved', 'rejected']),
    body('rejection_reason').optional().isString(),
  ], validate, asyncHandler(async (req, res) => {
    const allowed = ['status', 'rejection_reason', 'reviewed_by', 'reviewed_at'];
    const keys = Object.keys(req.body);
    if (keys.some((k) => !allowed.includes(k))) {
      throw badRequest('Only status / review fields are editable on an application');
    }
    const a = await MerchantApplication.findByPk(req.params.id);
    if (!a) throw notFound('MerchantApplication');
    await a.update(req.body);
    res.json({ ok: true, data: a });
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
  const a = await MerchantApplication.findOne({
    where: {
      id: req.params.id,
      user_id: req.user.id,
    },
  });

  if (!a) throw notFound("MerchantApplication");

  await a.destroy();

  res.json({
    ok: true,
    message: "MerchantApplication deleted",
  });
}));

  return router;
}
