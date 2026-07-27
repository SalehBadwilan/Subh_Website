/**
 * Categories (Admin) — Stage 3.
 *
 *   GET    /api/admin/categories
 *   POST   /api/admin/categories
 *   PUT    /api/admin/categories/:id
 *   PATCH  /api/admin/categories/:id/toggle-active
 *
 * `toggle-active` flips is_active. Disabling a category does NOT cascade (its
 * products keep their category_id, but the storefront already filters by
 * product.status). No FK CASCADE here — toggling is the "appropriate handling"
 * for hiding without breaking references.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound, ApiError } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { requireFullAdmin } from '../../../middleware/adminAuth.js';
import { serializeCategory } from '../utils/serializers.js';

export default function createAdminCategoryRoutes({ models }) {
const router = Router();
const { Category } = models;

// --- GET /api/admin/categories -------------------------------------------
// Unlike the public categories endpoint, this lists ALL categories (including
// inactive) so the admin can manage the taxonomy.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.is_active != null) where.is_active = req.query.is_active === 'true';
    if (req.query.parent_id) where.parent_id = req.query.parent_id;
    if (req.query.q) {
      where[Op.or] = [
        { name_ar: { [Op.iLike]: `%${req.query.q}%` } },
        { slug: { [Op.iLike]: `%${req.query.q}%` } },
      ];
    }

    const { rows, count } = await Category.findAndCountAll({
      where,
      limit,
      offset,
      order: [['sort_order', 'ASC'], ['name_ar', 'ASC']],
    });
    res.json(paginatedResponse(rows.map((c) => serializeCategory(c)), count, { page, limit }));
  }),
);

// --- POST /api/admin/categories ------------------------------------------
router.post(
  '/',
  requireFullAdmin,
  [
    body('slug').isString().isLength({ min: 1, max: 100 }).withMessage('slug required (1-100)'),
    body('name_ar').isString().isLength({ min: 1, max: 100 }).withMessage('name_ar required'),
    body('parent_id').optional({ nullable: true }).isUUID(),
    body('sort_order').optional().isInt({ min: 0 }),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const category = await Category.create({
slug: req.body.slug,
name_ar: req.body.name_ar,
parent_id: req.body.parent_id,
sort_order: req.body.sort_order,
is_active: req.body.is_active,
});
    res.status(201).json({ ok: true, data: serializeCategory(category) });
  }),
);

// --- PUT /api/admin/categories/:id ---------------------------------------
router.put(
  '/:id',
  requireFullAdmin,
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

    // Reject self-parenting (would create a tree loop).
    if (req.body.parent_id && req.body.parent_id === category.id) {
      throw new ApiError(400, 'لا يمكن تعيين التصنيف كأب لنفسه', { code: 'self_parent' });
    }

    await category.update({
slug: req.body.slug,
name_ar: req.body.name_ar,
parent_id: req.body.parent_id,
sort_order: req.body.sort_order,
is_active: req.body.is_active,
});
    res.json({ ok: true, data: serializeCategory(category) });
  }),
);

// --- PATCH /api/admin/categories/:id/toggle-active ----------------------
router.patch(
  '/:id/toggle-active',
  requireFullAdmin,
  asyncHandler(async (req, res) => {
    const category = await Category.findByPk(req.params.id);
    if (!category) throw notFound('Category');

    await category.update({ is_active: !category.is_active });
    res.json({ ok: true, data: { id: category.id, is_active: category.is_active } });
  }),
);

return router;
}

