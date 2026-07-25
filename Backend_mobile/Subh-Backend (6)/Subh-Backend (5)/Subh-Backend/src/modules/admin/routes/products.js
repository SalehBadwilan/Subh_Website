/**
 * Products (Admin) — Stage 3.
 *
 *   GET    /api/admin/products
 *   POST   /api/admin/products
 *   PUT    /api/admin/products/:id
 *   PATCH  /api/admin/products/:id/toggle-active
 *   POST   /api/admin/products/:id/assign             body: { merchant_id }
 *   DELETE /api/admin/products/:id/assign/:merchantId
 *
 * Assign / Unassign run inside a transaction because they touch the
 * merchant_products table + (optionally) the product's active state:
 *   - assign  → existence check (product + merchant) + duplicate guard, then
 *               insert into merchant_products.
 *   - unassign→ remove the merchant_products row, and if the product had no
 *               remaining merchant assignments we DO NOT delete the product
 *               (it's a central catalog item) — we just remove the link.
 *
 * `toggle-active` flips product.status between 'active' and 'archived' so the
 * catalog can be hidden without losing data. Drafts can also be activated.
 * Disabling a product does NOT cascade to merchant assignments because that
 * would silently break the catalog; assignments persist and are filtered by
 * product.status at the read level (this is the "appropriate handling").
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, notFound, badRequest, conflict } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { requireFullAdmin } from '../../../middleware/adminAuth.js';
import sequelize from '../../../config/database.js';
import { serializeProduct } from '../utils/serializers.js';

export default function createAdminProductRoutes({ models }) {
  const router = Router();
  const { Product, Category, MerchantProduct, Merchant } = models;

  // --- GET /api/admin/products ---------------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.category_id) where.category_id = req.query.category_id;
      if (req.query.q) {
        const q = String(req.query.q).trim();
        where[Op.or] = [
          { name_ar: { [Op.iLike]: `%${q}%` } },
          { sku: { [Op.iLike]: `%${q}%` } },
          { slug: { [Op.iLike]: `%${q}%` } },
        ];
      }

      const sortMap = {
        name: ['name_ar', 'ASC'],
        price_asc: ['price_sar', 'ASC'],
        price_desc: ['price_sar', 'DESC'],
        created_at: ['created_at', 'DESC'],
      };
      const order = [sortMap[req.query.sort] || ['created_at', 'DESC']];

      const { rows, count } = await Product.findAndCountAll({
        where,
        include: [
          { model: Category, attributes: ['id', 'slug', 'name_ar'] },
          { model: MerchantProduct, attributes: ['id', 'merchant_id'] },
        ],
        limit,
        offset,
        order,
        distinct: true,
      });

      res.json(paginatedResponse(rows.map((p) => serializeProduct(p)), count, { page, limit }));
    }),
  );

  // --- POST /api/admin/products --------------------------------------------
  router.post(
    '/',
    requireFullAdmin,
    [
      body('sku').isString().isLength({ min: 1, max: 50 }).withMessage('sku required (1-50)'),
      body('slug').isString().isLength({ min: 1, max: 150 }).withMessage('slug required (1-150)'),
      body('name_ar').isString().isLength({ min: 1, max: 200 }).withMessage('name_ar required'),
      body('price_sar').isFloat({ min: 0 }).withMessage('price_sar must be >= 0'),
      body('category_id').optional({ nullable: true }).isUUID(),
      body('description_ar').optional().isString(),
      body('vat_rate').optional().isFloat({ min: 0, max: 1 }),
      body('status').optional().isIn(['draft', 'active', 'archived']),
      body('weight_grams').optional().isInt({ min: 0 }),
      body('is_package').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const product = await Product.create({
  sku: req.body.sku,
  slug: req.body.slug,
  name_ar: req.body.name_ar,
  price_sar: req.body.price_sar,
  category_id: req.body.category_id,
  description_ar: req.body.description_ar,
  vat_rate: req.body.vat_rate,
  status: req.body.status,
  weight_grams: req.body.weight_grams,
  is_package: req.body.is_package,
});
      res.status(201).json({ ok: true, data: serializeProduct(product) });
    }),
  );

  // --- PUT /api/admin/products/:id -----------------------------------------
  router.put(
    '/:id',
    requireFullAdmin,
    [
      body('sku').optional().isString().isLength({ min: 1, max: 50 }),
      body('slug').optional().isString().isLength({ min: 1, max: 150 }),
      body('name_ar').optional().isString().isLength({ min: 1, max: 200 }),
      body('price_sar').optional().isFloat({ min: 0 }),
      body('category_id').optional({ nullable: true }).isUUID(),
      body('description_ar').optional().isString(),
      body('vat_rate').optional().isFloat({ min: 0, max: 1 }),
      body('status').optional().isIn(['draft', 'active', 'archived']),
      body('weight_grams').optional().isInt({ min: 0 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const product = await Product.findByPk(req.params.id);
      if (!product) throw notFound('Product');
      await product.update({
  sku: req.body.sku,
  slug: req.body.slug,
  name_ar: req.body.name_ar,
  price_sar: req.body.price_sar,
  category_id: req.body.category_id,
  description_ar: req.body.description_ar,
  vat_rate: req.body.vat_rate,
  status: req.body.status,
  weight_grams: req.body.weight_grams,
});
      res.json({ ok: true, data: serializeProduct(product) });
    }),
  );

  // --- PATCH /api/admin/products/:id/toggle-active -------------------------
  // Toggles between 'active' and 'archived'. Drafts become 'active'. Returns
  // the new status so the client can update without a refetch.
  router.patch(
    '/:id/toggle-active',
    requireFullAdmin,
    asyncHandler(async (req, res) => {
      const product = await Product.findByPk(req.params.id);
      if (!product) throw notFound('Product');

      const nextStatus = product.status === 'active' ? 'archived' : 'active';
      await product.update({ status: nextStatus });

      res.json({
        ok: true,
        data: { id: product.id, status: product.status },
      });
    }),
  );

  // --- POST /api/admin/products/:id/assign ---------------------------------
  // Assigns a product to a merchant. Body: { merchant_id }.
  // Validates existence of both entities + forbids duplicate assignments.
  router.post(
    '/:id/assign',
    requireFullAdmin,
    [
      body('merchant_id').isUUID().withMessage('merchant_id (UUID) required'),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const productId = req.params.id;
      const { merchant_id: merchantId } = req.body;

      const result = await sequelize.transaction(async (t) => {
        // Existence checks inside the transaction.
        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) throw notFound('Product');

        const merchant = await Merchant.findByPk(merchantId, { transaction: t });
        if (!merchant) throw notFound('Merchant');
        // A suspended/terminated merchant cannot receive new assignments.
        if (merchant.status !== 'active') {
          throw badRequest(
  'لا يمكن تعيين منتج لتاجر غير نشط', { code: 'merchant_terminated' });
        }

        // Duplicate-assignment guard. Both must be product-scoped (not package).
        const existing = await MerchantProduct.findOne({
          where: { merchant_id: merchantId, product_id: productId, package_id: null },
          transaction: t,
        });
        if (existing) {
          throw conflict('المنتج معيّن لهذا التاجر مسبقًا', { code: 'duplicate_assignment' });
        }

        const mp = await MerchantProduct.create(
          {
            merchant_id: merchantId,
            product_id: productId,
            package_id: null,
            is_active: true,
          },
          { transaction: t },
        );
        return mp;
      });

      res.status(201).json({
        ok: true,
        message: 'تم تعيين المنتج للتاجر',
        data: {
          merchant_product_id: result.id,
          product_id: productId,
          merchant_id: merchantId,
        },
      });
    }),
  );

  // --- GET /api/admin/merchant-products -----------------------------
router.get(
  "/merchant-products",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);

    const { rows, count } = await MerchantProduct.findAndCountAll({
      limit,
      offset,
    });

    res.json(paginatedResponse(rows, count, { page, limit }));
  }),
);
  // --- DELETE /api/admin/products/:id/assign/:merchantId -------------------
  // Removes a single merchant↔product assignment. Safe no-op (404) when the
  // assignment does not exist. Does NOT cascade to orphans — the product stays.
  router.delete(
    '/:id/assign/:merchantId',
    requireFullAdmin,
    asyncHandler(async (req, res) => {
      const { id: productId, merchantId } = req.params;

      const deleted = await sequelize.transaction(async (t) => {
        // Existence checks so we return clean 404s instead of a silent no-op.
        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) throw notFound('Product');
        const merchant = await Merchant.findByPk(merchantId, { transaction: t });
        if (!merchant) throw notFound('Merchant');

        const count = await MerchantProduct.destroy({
          where: { merchant_id: merchantId, product_id: productId, package_id: null },
          transaction: t,
        });
        return count;
      });

      if (!deleted) {
        throw notFound('MerchantProduct assignment');
      }

      res.json({
        ok: true,
        message: 'تم إلغاء تعيين المنتج من التاجر',
        data: { product_id: productId, merchant_id: merchantId },
      });
    }),
  );

  return router;
}
