import { Router } from 'express';
import { body } from 'express-validator';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound, badRequest } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';

export default function createInventoryRoutes({ models }) {
  const router = Router();
  const { Inventory } = models;

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.sellable_type) where.sellable_type = req.query.sellable_type;
    if (req.query.sellable_id) where.sellable_id = req.query.sellable_id;
    if (req.query.sku) where.sku = req.query.sku;
    const { rows, count } = await Inventory.findAndCountAll({ where, limit, offset });
    res.json(paginatedResponse(rows, count, { page, limit }));
  }));

  // Create-or-set stock for a sellable item. The (sellable_type, sellable_id)
  // pair is UNIQUE, so this acts as an idempotent "set stock" used by the admin
  // catalog when a new product is added — without it, newly created products
  // could never be ordered (customer orders 409 on missing inventory).
  router.post('/', [
    body('sellable_type').isIn(['product', 'package']).withMessage('sellable_type must be product|package'),
    body('sellable_id').isUUID().withMessage('sellable_id (UUID) required'),
    body('sku').isString().isLength({ min: 1, max: 50 }).withMessage('sku required'),
    body('on_hand').isInt({ min: 0 }).withMessage('on_hand must be >= 0'),
    body('reorder_threshold').optional().isInt({ min: 0 }),
  ], validate, asyncHandler(async (req, res) => {
    const { sellable_type, sellable_id, sku, on_hand, reorder_threshold } = req.body;
    const [inv, created] = await Inventory.findOrCreate({
      where: { sellable_type, sellable_id },
      defaults: {
        sellable_type,
        sellable_id,
        sku,
        on_hand,
        reserved: 0,
        reorder_threshold: reorder_threshold ?? 5,
      },
    });
    if (!created) {
      const updates = { on_hand };
      if (reorder_threshold != null) updates.reorder_threshold = reorder_threshold;
      await inv.update(updates);
    }
    res.status(created ? 201 : 200).json({ ok: true, data: inv });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const inv = await Inventory.findByPk(req.params.id);
    if (!inv) throw notFound('Inventory');
    res.json({ ok: true, data: inv });
  }));

  // Limited update — only stock fields. Enforces reserved <= on_hand.
  router.put('/:id', [
    body('on_hand').optional().isInt({ min: 0 }),
    body('reserved').optional().isInt({ min: 0 }),
    body('reorder_threshold').optional().isInt({ min: 0 }),
  ], validate, asyncHandler(async (req, res) => {
    const allowed = ['on_hand', 'reserved', 'reorder_threshold'];
    if (Object.keys(req.body).some((k) => !allowed.includes(k))) {
      throw badRequest('Only stock fields are editable on inventory');
    }
    const inv = await Inventory.findByPk(req.params.id);
    if (!inv) throw notFound('Inventory');
    await inv.update(req.body);
    res.json({ ok: true, data: inv });
  }));

  return router;
}
