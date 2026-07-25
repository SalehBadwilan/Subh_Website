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

export default function createMerchantRoutes({ models }) {
  const router = Router();
  const { Merchant } = models;
  router.use(authenticate());
router.use(requireMerchant);

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {
  id: req.merchant.id,
};

if (req.query.status) {
  where.status = req.query.status;
}
    const { rows, count } = await Merchant.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const m = await Merchant.findOne({
  where: {
    id: req.merchant.id,
  },
});
    if (!m) throw notFound('Merchant');
    res.json({ ok: true, data: m });
  }));

  router.post('/', [
    body('user_id').isUUID(),
    body('commercial_name').isString().isLength({ min: 1, max: 150 }),
    body('commercial_registration_no').isString().isLength({ min: 1, max: 50 }),
    body('iban').isString().isLength({ min: 1, max: 34 }),
    body('commission_rate').optional().isFloat({ min: 0, max: 1 }),
    body('vat_number').optional().isString(),
  ], validate, asyncHandler(async (req, res) => {
    const m = await Merchant.create(req.body);
    res.status(201).json({ ok: true, data: m });
  }));

  router.put('/:id', [
    
    body('commercial_name').optional().isString().isLength({ min: 1, max: 150 }),
    body('iban').optional().isString().isLength({ min: 1, max: 34 }),
    
  ], validate, asyncHandler(async (req, res) => {
    const m = await Merchant.findOne({
  where: {
    id: req.merchant.id,
  },
});
    if (!m) throw notFound('Merchant');
    await m.update({
  commercial_name: req.body.commercial_name,
  iban: req.body.iban,
});
    res.json({ ok: true, data: m });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
  const m = await Merchant.findOne({
    where: {
      id: req.merchant.id,
    },
  });

  if (!m) throw notFound('Merchant');

  await m.destroy(); // soft delete (paranoid)

  res.json({
    ok: true,
    message: 'Merchant deleted',
  });
}));

  return router;
}
