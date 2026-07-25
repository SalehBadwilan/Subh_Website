import { Router } from 'express';
import { body, query } from 'express-validator';
import { Op } from 'sequelize';
import asyncHandler from '../../utils/asyncHandler.js';
import { ApiError, notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createCategoryRoutes({ models }) {
  const router = Router();
  const { Category, Product, ProductImage, Inventory } = models;

  // LIST — active categories only, ordered by Arabic name then sort order.
  // Returns a plain array (empty array when none exist).
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      // Optional parent filter for tree navigation; active-only by default.
      const where = { is_active: true };
      if (req.query.parent_id) where.parent_id = req.query.parent_id;

      const rows = await Category.findAll({
        where,
        order: [['name_ar', 'ASC'], ['sort_order', 'ASC']],
      });

      res.status(200).json({ ok: true, data: rows });
    }),
  );

  // GET ONE
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const category = await Category.findByPk(req.params.id, {
        include: { association: 'children', required: false },
      });
      if (!category) throw notFound('Category');
      res.json({ ok: true, data: category });
    }),
  );

  // CREATE
  router.post(
    '/',
    [
      body('slug').isString().isLength({ min: 1, max: 100 }).withMessage('slug required (1-100)'),
      body('name_ar').isString().isLength({ min: 1, max: 100 }).withMessage('name_ar required'),
      body('parent_id').optional({ nullable: true }).isUUID(),
      body('sort_order').optional().isInt({ min: 0 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const category = await Category.create(req.body);
      res.status(201).json({ ok: true, data: category });
    }),
  );

  // UPDATE
  router.put(
    '/:id',
    [
      body('slug').optional().isString().isLength({ min: 1, max: 100 }),
      body('name_ar').optional().isString().isLength({ min: 1, max: 100 }),
      body('parent_id').optional({ nullable: true }).isUUID(),
      body('sort_order').optional().isInt({ min: 0 }),
      body('is_active').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const category = await Category.findByPk(req.params.id);
      if (!category) throw notFound('Category');
      await category.update(req.body);
      res.json({ ok: true, data: category });
    }),
  );

  // DELETE
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const deleted = await Category.destroy({ where: { id: req.params.id } });
      if (!deleted) throw notFound('Category');
      res.json({ ok: true, message: 'Category deleted' });
    }),
  );

  // --- GET /api/categories/:id/products ------------------------------------
  // Customer-facing: list ACTIVE products inside a category. Validates that the
  // category exists and is active. Supports pagination + price sort/filter.
  router.get(
    '/:id/products',
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('min_price').optional().isFloat({ min: 0 }).toFloat(),
      query('max_price').optional().isFloat({ min: 0 }).toFloat(),
      query('sort').optional().isIn(['newest', 'price_asc', 'price_desc', 'name']),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const category = await Category.findByPk(req.params.id);
      if (!category || !category.is_active) throw notFound('Category');

      const { page, limit, offset } = parsePagination(req.query);
      const where = { category_id: category.id, status: 'active' };

      const priceFilter = {};
      if (req.query.min_price != null) priceFilter[Op.gte] = req.query.min_price;
      if (req.query.max_price != null) priceFilter[Op.lte] = req.query.max_price;
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
        default:
          order.push(['created_at', 'DESC']);
      }

      const { rows, count } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: ProductImage,
            as: 'ProductImages',
            required: false,
            separate: true,
            order: [['sort_order', 'ASC'], ['is_primary', 'DESC']],
          },
        ],
        limit,
        offset,
        order,
        distinct: true,
      });

      // Attach availability from the polymorphic inventory table.
      const ids = rows.map((r) => r.id);
      let availabilityMap = {};
      if (ids.length && Inventory) {
        const inv = await Inventory.findAll({
          where: { sellable_type: 'product', sellable_id: { [Op.in]: ids } },
          attributes: ['sellable_id', 'on_hand', 'reserved'],
        });
        availabilityMap = Object.fromEntries(
          inv.map((i) => [i.sellable_id, Math.max(0, (i.on_hand || 0) - (i.reserved || 0))]),
        );
      }

      const data = rows.map((p) => {
        const imgs = p.ProductImages || [];
        const primary = imgs.find((i) => i.is_primary) || imgs[0];
        const available = availabilityMap[p.id] || 0;
        return {
          id: p.id,
          slug: p.slug,
          sku: p.sku,
          name_ar: p.name_ar,
          description_ar: p.description_ar,
          price_sar: p.price_sar,
          vat_rate: p.vat_rate,
          image_url: primary ? primary.url : null,
          stock_available: available,
          in_stock: available > 0,
        };
      });

      res.json(paginatedResponse(data, count, { page, limit }));
    }),
  );

  return router;
}
