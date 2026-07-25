/**
 * Operations inventory routes (Stage 4).
 *
 *   GET  /api/operations/inventory                platform-wide stock list
 *                                                 (paginated, filtered, sorted)
 *   POST /api/operations/inventory/:id/adjust     adjust on_hand for one SKU.
 *                                                 Runs inside a transaction,
 *                                                 refuses to go negative, and
 *                                                 ALWAYS appends a StockMovement
 *                                                 row capturing before / delta /
 *                                                 after / reason / actor / time.
 *   GET  /api/operations/inventory/movements      the inventory-movement ledger
 *                                                 (paginated, filtered, sorted).
 *
 * Authorization: every route is platform-wide (the central warehouse is owned by
 * Subh, not a single merchant). Mutations require `requireOperationsWrite` —
 * Admin Employee (read-only) is blocked at POST /adjust.
 *
 * Negative-stock guarantee:
 *   - The inventory table has a DB-level CHECK (on_hand >= 0), so even a bug in
 *     the app layer cannot create a negative row.
 *   - The handler ALSO validates in-transaction (with the row locked) and
 *     rejects with 409 before attempting the write, returning a clear message.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import sequelize from '../../../config/database.js';
import { requireOperationsWrite } from '../../../middleware/operationsAuth.js';
import { serializeInventory, serializeMovement } from '../utils/serializers.js';

export default function createOperationsInventoryRoutes({ models }) {
  const router = Router();
  const { Inventory, Product, Package, StockMovement, User } = models;

  // --- GET /api/operations/inventory -----------------------------------------
  router.get(
    '/',
    [
      query('q').optional().isString().trim().isLength({ max: 100 }),
      query('availability').optional().isIn(['in_stock', 'low_stock', 'out_of_stock']),
      query('sellable_type').optional().isIn(['product', 'package']),
      query('sort').optional().isIn(['newest', 'on_hand_asc', 'on_hand_desc', 'available_asc']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);

      const where = {};
      if (req.query.sellable_type) where.sellable_type = req.query.sellable_type;

      const sort = req.query.sort || 'newest';
      const order = [];
      switch (sort) {
        case 'on_hand_asc':
          order.push(['on_hand', 'ASC']);
          break;
        case 'on_hand_desc':
          order.push(['on_hand', 'DESC']);
          break;
        case 'available_asc':
          order.push(['on_hand', 'ASC']);
          break;
        case 'newest':
        default:
          order.push(['created_at', 'DESC']);
      }

      const { rows, count } = await Inventory.findAndCountAll({
        where,
        limit,
        offset,
        order,
        raw: true,
      });

      // Attach catalog rows (name/sku/status) for the sellable ids in the page.
      const involvedProductIds = rows
        .filter((r) => r.sellable_type === 'product')
        .map((r) => r.sellable_id);
      const involvedPackageIds = rows
        .filter((r) => r.sellable_type === 'package')
        .map((r) => r.sellable_id);

      const products = involvedProductIds.length
        ? await Product.findAll({
            where: { id: { [Op.in]: involvedProductIds } },
            attributes: ['id', 'name_ar', 'sku', 'status', 'price_sar'],
            raw: true,
          })
        : [];
      const packages = involvedPackageIds.length
        ? await Package.findAll({
            where: { id: { [Op.in]: involvedPackageIds } },
            attributes: ['id', 'name_ar', 'sku', 'status', 'price_sar'],
            raw: true,
          })
        : [];

      const catalogBySellable = {};
      for (const p of products) catalogBySellable[`product:${p.id}`] = p;
      for (const p of packages) catalogBySellable[`package:${p.id}`] = p;

      let combined = rows.map((inv) => {
        const catalog = catalogBySellable[`${inv.sellable_type}:${inv.sellable_id}`] || null;
        return { inv, catalog };
      });
      combined = combined.filter((c) => c.catalog !== null);

      // Availability filter (post-query so we can use computed available).
      if (req.query.availability) {
        combined = combined.filter((c) => {
          const available = Math.max(0, (c.inv.on_hand || 0) - (c.inv.reserved || 0));
          if (req.query.availability === 'in_stock') return available > (c.inv.reorder_threshold || 0);
          if (req.query.availability === 'low_stock')
            return available > 0 && available <= (c.inv.reorder_threshold || 0);
          if (req.query.availability === 'out_of_stock') return available <= 0;
          return true;
        });
      }

      // Text filter on catalog name/sku (post-query, in-memory).
      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
      if (q) {
        combined = combined.filter(
          (c) =>
            c.catalog &&
            ((c.catalog.name_ar || '').toLowerCase().includes(q) ||
              (c.catalog.sku || '').toLowerCase().includes(q) ||
              (c.inv.sku || '').toLowerCase().includes(q)),
        );
      }

      const data = combined.map((c) => serializeInventory(c.inv, c.catalog));
      res.json(paginatedResponse(data, data.length, { page, limit }));
    }),
  );

  // --- POST /api/operations/inventory/:id/adjust ----------------------------
  router.post(
    '/:id/adjust',
    [
      // delta is a signed integer: positive = restock, negative = consume.
      body('delta')
        .exists({ checkFalsy: false })
        .isInt({ min: -1000000, max: 1000000 })
        .withMessage('delta يجب أن يكون عددًا صحيحًا'),
      body('reason')
        .exists({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('reason مطلوب (1-255 حرف)'),
      body('reference_type').optional().isString().isLength({ max: 50 }),
      body('reference_id').optional().isUUID(),
    ],
    validate,
    requireOperationsWrite,
    asyncHandler(async (req, res) => {
      const { delta, reason, reference_type, reference_id } = req.body;
      const numericDelta = Number(delta);

      // A zero delta is a no-op that would still write a ledger row — reject it
      // so the ledger only carries real changes.
      if (numericDelta === 0) {
        throw new ApiError(400, 'delta لا يمكن أن يكون صفرًا', { code: 'zero_delta' });
      }

      const result = await sequelize.transaction(async (t) => {
        // Lock the inventory row so concurrent adjustments serialize correctly.
        const inventory = await Inventory.findByPk(req.params.id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!inventory) throw notFound('Inventory');

        const before = inventory.on_hand;
        const after = before + numericDelta;

        // Negative-stock guard. The DB CHECK (on_hand >= 0) is the last line of
        // defense; we reject here for a clear, actionable error.
        if (after < 0) {
          throw new ApiError(409, 'التعديل سيجعل الكمية سالبة', {
            code: 'negative_stock',
            before,
            delta: numericDelta,
            attempted_after: after,
          });
        }

        await inventory.update({ on_hand: after }, { transaction: t });

        // ALWAYS record the movement. Captured fields match the spec:
        // before / delta / after / reason / actor / time (time = created_at).
        const movement = await StockMovement.create(
          {
            inventory_id: inventory.id,
            type: 'adjustment',
            delta: numericDelta,
            reason,
            reference_type: reference_type || null,
            reference_id: reference_id || null,
            actor_id: req.user.id,
          },
          { transaction: t },
        );

        return { inventory, movement, before, after };
      });

      res.json({
        ok: true,
        data: {
          inventory: serializeInventory(result.inventory),
          movement: serializeMovement(result.movement, {
            before: result.before,
            after: result.after,
          }),
        },
      });
    }),
  );

  // --- GET /api/operations/inventory/movements -------------------------------
  // NOTE: registered AFTER /:id/adjust and using a non-colliding literal path
  // ('/movements') so Express never mistakes 'movements' for an inventory id.
  router.get(
    '/movements',
    [
      query('inventory_id').optional().isUUID(),
      query('type').optional().isIn([
        'restock',
        'reserve',
        'release',
        'consume',
        'adjustment',
        'return',
      ]),
      query('actor_id').optional().isUUID(),
      query('from').optional().isISO8601().toDate(),
      query('to').optional().isISO8601().toDate(),
      query('sort').optional().isIn(['newest', 'oldest']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);

      const where = {};
      if (req.query.inventory_id) where.inventory_id = req.query.inventory_id;
      if (req.query.type) where.type = req.query.type;
      if (req.query.actor_id) where.actor_id = req.query.actor_id;

      const createdWhere = {};
      if (req.query.from) createdWhere[Op.gte] = req.query.from;
      if (req.query.to) createdWhere[Op.lte] = req.query.to;
      if (Object.keys(createdWhere).length) where.created_at = createdWhere;

      const order = req.query.sort === 'oldest' ? [['created_at', 'ASC']] : [['created_at', 'DESC']];

      const { rows, count } = await StockMovement.findAndCountAll({
        where,
        include: [
          {
            model: Inventory,
            required: false,
            attributes: ['id', 'sku', 'sellable_type', 'sellable_id', 'on_hand', 'reserved'],
          },
          {
            model: User,
            as: 'Actor',
            required: false,
            attributes: ['id', 'full_name'],
          },
        ],
        limit,
        offset,
        order,
        distinct: true,
        subQuery: false,
      });

      res.json(paginatedResponse(rows.map((m) => serializeMovement(m)), count, { page, limit }));
    }),
  );

  return router;
}
