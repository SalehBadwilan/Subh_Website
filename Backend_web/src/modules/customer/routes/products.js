/**
 * Customer-facing catalog routes (read-only).
 *
 *   GET /api/products                     paginated active products + filters
 *   GET /api/products/:id                 one product (with images + category)
 *   GET /api/products/search              ?q=... full-text / ILIKE search
 *
 * These are PUBLIC (no auth) browse endpoints: they expose only published
 * (`status='active'`) catalog rows and never leak draft/archived items.
 *
 * NOTE: the generic /products CRUD router (src/routes/catalog/products.js)
 * remains mounted unchanged for admin tooling; it is unaffected because these
 * customer endpoints reuse the exact same path with safe read-only handlers.
 * They are registered FIRST in routes/index.js so the browse semantics win.
 */
import { Router } from 'express';
import { query } from 'express-validator';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';

export default function createCustomerProductRoutes({ models }) {
  const router = Router();
  const {
  Product,
  ProductImage,
  Category,
  Inventory,
  Merchant,
  MerchantProduct,
} = models;

  // Inventory is a polymorphic table (sellable_type + sellable_id) with NO
  // direct Sequelize association to Product, so we fetch it separately and map
  // availability onto each product. This avoids adding associations that could
  // disturb the polymorphic design.
  const fetchAvailabilityMap = async (productIds) => {
    if (!productIds.length) return {};
    const rows = await Inventory.findAll({
      where: { sellable_type: 'product', sellable_id: { [Op.in]: productIds } },
      attributes: ['sellable_id', 'on_hand', 'reserved'],
    });
    const map = {};
    for (const r of rows) {
      map[r.sellable_id] = Math.max(0, (r.on_hand || 0) - (r.reserved || 0));
    }
    return map;
  };

  // Eager-loaded associations reused across list/detail.
  const productInclude = () => [
  {
    model: ProductImage,
    as: 'ProductImages',
    required: false,
    separate: true,
    order: [['sort_order', 'ASC'], ['is_primary', 'DESC']],
  },
  {
    model: Category,
    as: 'Category',
    required: false,
    attributes: ['id', 'slug', 'name_ar'],
  },
  {
    model: MerchantProduct,
    required: false,
    attributes: ['merchant_id', 'product_id'],
    include: [
      {
        model: Merchant,
        required: false,
        attributes: ['id', 'commercial_name'],
      },
    ],
  },
];

  /**
   * Build the customer-facing product object, omitting internal fields
   * and adding a convenience availability flag. Image fields are unified with
   * the merchant/admin responses: `image_url` (primary) + `images[]` gallery
   * where each entry uses `image_url` (not `url`) for consistency.
   */
  const toCustomerProduct = (p, availability = 0) => {
  const primaryImage =
    (p.ProductImages || []).find((i) => i.is_primary) ||
    (p.ProductImages || [])[0];

  // الجديد
  const merchant = p.MerchantProducts?.[0]?.Merchant || null;

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name_ar: p.name_ar,
    description_ar: p.description_ar,
    price_sar: p.price_sar,
    vat_rate: p.vat_rate,
    category: p.Category || null,

    // الجديد
    merchant: merchant
      ? {
          id: merchant.id,
          commercial_name: merchant.commercial_name,
        }
      : null,

    image_url: primaryImage ? primaryImage.url : null,
    images: (p.ProductImages || []).map((i) => ({
      id: i.id,
      image_url: i.url,
      alt_text_ar: i.alt_text_ar,
      is_primary: i.is_primary,
    })),
    stock_available: availability,
    in_stock: availability > 0,
  };
};

  // Attach availability and serialize a list of products.
  const serializeList = async (rows) => {
    const availabilityMap = await fetchAvailabilityMap(rows.map((r) => r.id));
    return rows.map((r) => toCustomerProduct(r, availabilityMap[r.id] || 0));
  };

  // --- GET /api/products ----------------------------------------------------
  // Public browse. Filters: category_id, q (name), min_price, max_price, sort.
  router.get(
    '/',
    [
      query('category_id').optional().isUUID().withMessage('category_id غير صالح'),
      query('q').optional().isString().trim().isLength({ max: 100 }),
      query('min_price').optional().isFloat({ min: 0 }).toFloat(),
      query('max_price').optional().isFloat({ min: 0 }).toFloat(),
      query('sort').optional().isIn(['newest', 'price_asc', 'price_desc', 'name']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = { status: 'active' };

      if (req.query.category_id) where.category_id = req.query.category_id;

      const q = req.query.q ? String(req.query.q).trim() : '';
      if (q) {
        where[Op.or] = [
          { name_ar: { [Op.iLike]: `%${q}%` } },
          { description_ar: { [Op.iLike]: `%${q}%` } },
          { sku: { [Op.iLike]: `%${q}%` } },
        ];
      }

      const priceFilter = {};
      if (req.query.min_price != null) priceFilter[Op.gte] = req.query.min_price;
      if (req.query.max_price != null) {
        if (priceFilter[Op.gte] != null && Number(req.query.max_price) < Number(req.query.min_price)) {
          // invalid range -> empty result, clearer than a 422 here.
          return res.json(paginatedResponse([], 0, { page, limit }));
        }
        priceFilter[Op.lte] = req.query.max_price;
      }
      if (Object.keys(priceFilter).length) where.price_sar = priceFilter;

      const order = [];
      switch (req.query.sort) {
        case 'price_asc':
          order.push(['price_sar', 'ASC']);
          break;
        case 'price_desc':
          order.push(['price_sar', 'DESC']);
          break;
        case 'name':
          order.push(['name_ar', 'ASC']);
          break;
        case 'newest':
        default:
          order.push(['created_at', 'DESC']);
      }

      const { rows, count } = await Product.findAndCountAll({
  where,
  include: productInclude(),
  limit,
  offset,
  order,
  distinct: true,
});

console.dir(rows[0]?.toJSON(), { depth: null });

res.json(paginatedResponse(await serializeList(rows), count, { page, limit }));
    }),
  );

  // --- GET /api/products/search --------------------------------------------
  // Dedicated search endpoint. `q` is required and minimum 2 chars to avoid
  // returning the whole catalog on an empty query.
  router.get(
    '/search',
    [
      query('q')
        .exists({ checkFalsy: true })
        .withMessage('كلمة البحث q مطلوبة')
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('كلمة البحث يجب أن تكون بين حرفين و100 حرف'),
      query('category_id').optional().isUUID(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const q = String(req.query.q).trim();

      const where = {
        status: 'active',
        [Op.or]: [
          { name_ar: { [Op.iLike]: `%${q}%` } },
          { description_ar: { [Op.iLike]: `%${q}%` } },
          { sku: { [Op.iLike]: `%${q}%` } },
          { slug: { [Op.iLike]: `%${q}%` } },
        ],
      };
      if (req.query.category_id) where.category_id = req.query.category_id;

      const { rows, count } = await Product.findAndCountAll({
        where,
        include: productInclude(),
        limit,
        offset,
        order: [['name_ar', 'ASC']],
        distinct: true,
      });

      res.json(paginatedResponse(await serializeList(rows), count, { page, limit }));
    }),
  );

  // --- GET /api/products/:id -----------------------------------------------
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const product = await Product.findByPk(req.params.id, {
        include: productInclude(),
      });
      if (!product || product.status !== 'active') throw notFound('Product');
      const availabilityMap = await fetchAvailabilityMap([product.id]);
      res.json({ ok: true, data: toCustomerProduct(product, availabilityMap[product.id] || 0) });
    }),
  );

  return router;
}

