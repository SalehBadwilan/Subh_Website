import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { ApiError, notFound } from '../../utils/ApiError.js';
import validate from '../../middleware/validate.js';

export default function createCategoryRoutes({ models }) {
  const router = Router();
  const { Category } = models;

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

  return router;
}
