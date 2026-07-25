import { Router } from 'express';
import { Op } from 'sequelize';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createProductRoutes({ models }) {
  const router = Router();
  const { Product, ProductImage } = models;

  /**
   * Resolve image galleries for a list of product ids, keyed by product_id,
   * primary-first. Attached onto each product row so the serializer can emit a
   * unified `image_url` + `images` shape (matching merchant + customer APIs).
   */
  const fetchImagesMap = async (productIds) => {
    if (!productIds.length) return {};
    const rows = await ProductImage.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ['id', 'product_id', 'url', 'alt_text_ar', 'is_primary', 'sort_order'],
      order: [['is_primary', 'DESC'], ['sort_order', 'ASC'], ['created_at', 'ASC']],
      raw: true,
    });
    const map = {};
    for (const r of rows) {
      if (!map[r.product_id]) map[r.product_id] = [];
      map[r.product_id].push({
        id: r.id,
        url: r.url,
        alt_text_ar: r.alt_text_ar,
        is_primary: r.is_primary,
      });
    }
    return map;
  };

  /**
   * Serialize a catalog product with a unified image shape:
   *   image_url — primary/cover image URL (null when none)
   *   images    — full gallery (primary first)
   * `gallery` is read off the product instance's ProductImages (eager-loaded
   * for GET /:id) or from a ProductImages field we attach for LIST rows.
   */
  const serialize = (p) => {
    const gallery = Array.isArray(p.ProductImages) ? p.ProductImages : [];
    const primary = gallery.find((i) => i.is_primary) || gallery[0] || null;
    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name_ar: p.name_ar,
      description_ar: p.description_ar,
      category_id: p.category_id,
      price_sar: Number(p.price_sar),
      vat_rate: Number(p.vat_rate),
      status: p.status,
      weight_grams: p.weight_grams,
      is_package: p.is_package,
      image_url: primary ? primary.url : null,
      images: gallery.map((i) => ({
        id: i.id,
        image_url: i.url,
        alt_text_ar: i.alt_text_ar,
        is_primary: i.is_primary,
      })),
    };
  };

  // LIST — filterable by category_id, status + pagination
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.category_id) where.category_id = req.query.category_id;
      if (req.query.status) where.status = req.query.status;
      const { rows, count } = await Product.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });
      // Attach galleries so each row carries image_url + images, matching the
      // detail endpoint and the merchant/customer product responses.
      const imagesMap = await fetchImagesMap(rows.map((r) => r.id));
      for (const r of rows) r.ProductImages = imagesMap[r.id] || [];
      res.json(paginatedResponse(rows.map(serialize), count, { page, limit }));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const product = await Product.findByPk(req.params.id, {
        include: [{ model: ProductImage, as: 'ProductImages', required: false }],
      });
      if (!product) throw notFound('Product');
      res.json({ ok: true, data: serialize(product) });
    }),
  );

  router.post(
    '/',
    [
      body('sku').isString().isLength({ min: 1, max: 50 }).withMessage('sku required'),
      body('slug').isString().isLength({ min: 1, max: 150 }).withMessage('slug required'),
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
      const product = await Product.create(req.body);
      // New product has no images yet → serialize yields image_url: null.
      product.ProductImages = [];
      res.status(201).json({ ok: true, data: serialize(product) });
    }),
  );

  router.put(
    '/:id',
    [
      body('sku').optional().isString().isLength({ min: 1, max: 50 }),
      body('slug').optional().isString().isLength({ min: 1, max: 150 }),
      body('name_ar').optional().isString().isLength({ min: 1, max: 200 }),
      body('price_sar').optional().isFloat({ min: 0 }),
      body('category_id').optional({ nullable: true }).isUUID(),
      body('vat_rate').optional().isFloat({ min: 0, max: 1 }),
      body('status').optional().isIn(['draft', 'active', 'archived']),
      body('weight_grams').optional().isInt({ min: 0 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const product = await Product.findByPk(req.params.id, {
        include: [{ model: ProductImage, as: 'ProductImages', required: false }],
      });
      if (!product) throw notFound('Product');
      await product.update(req.body);
      res.json({ ok: true, data: serialize(product) });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const product = await Product.findByPk(req.params.id);
      if (!product) throw notFound('Product');
      await product.destroy(); // soft delete (paranoid)
      res.json({ ok: true, message: 'Product deleted' });
    }),
  );

  return router;
}
