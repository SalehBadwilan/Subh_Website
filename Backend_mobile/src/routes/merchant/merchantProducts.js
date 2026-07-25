import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound, badRequest } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import { authenticate } from "../../middleware/auth.js";
import {
  requireMerchant,
  requireEmployeePermission,
} from "../../middleware/merchantAuth.js";

export default function createMerchantProductRoutes({ models }) {
  const router = Router();
  const { MerchantProduct } = models;
  router.use(authenticate());
router.use(requireMerchant);
router.use(requireEmployeePermission("products"));

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {
  merchant_id: req.merchant.id,
};
    const { rows, count } = await MerchantProduct.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const mp = await MerchantProduct.findOne({
  where: {
    id: req.params.id,
    merchant_id: req.merchant.id,
  },
});
    if (!mp) throw notFound('MerchantProduct');
    res.json({ ok: true, data: mp });
  }));

  router.post('/', [
    
    body('product_id').optional({ nullable: true }).isUUID(),
    body('package_id').optional({ nullable: true }).isUUID(),
    body('is_active').optional().isBoolean(),
  ], validate, asyncHandler(async (req, res) => {
    // Enforce XOR (also enforced at DB level, but fail early with a clearer msg)
    const { product_id, package_id } = req.body;
    if ((product_id == null) === (package_id == null)) {
      throw badRequest('Provide exactly one of product_id or package_id');
    }
    const mp = await MerchantProduct.create({
  ...req.body,
  merchant_id: req.merchant.id,
});
    res.status(201).json({ ok: true, data: mp });
  }));

  router.put('/:id', [
    body('is_active').optional().isBoolean(),
  ], validate, asyncHandler(async (req, res) => {
    const mp = await MerchantProduct.findOne({
  where: {
    id: req.params.id,
    merchant_id: req.merchant.id,
  },
});
    if (!mp) throw notFound('MerchantProduct');
    await mp.update({
  is_active: req.body.is_active,
});
    res.json({ ok: true, data: mp });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const deleted = await MerchantProduct.destroy({
  where: {
    id: req.params.id,
    merchant_id: req.merchant.id,
  },
});
    if (!deleted) throw notFound('MerchantProduct');
    res.json({ ok: true, message: 'MerchantProduct deleted' });
  }));

  return router;
}
