/**
 * GET /api/merchant/inventory
 *
 * Lists the inventory rows for the products/packages this merchant is
 * authorized to sell (MerchantProduct join → Inventory polymorphic key), with
 * the catalog row attached. Read-only for merchants — adjustment requests go
 * through the update-request flow. Paginated, filterable, sortable.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { serializeInventory } from '../utils/serializers.js';

export default function createMerchantInventoryRoutes() {
  const router = Router();

  router.get(
    '/',
    [
      query('q').optional().isString().trim().isLength({ max: 100 }),
      query('availability').optional().isIn(['in_stock', 'low_stock', 'out_of_stock']),
      query('sort').optional().isIn(['newest', 'on_hand_asc', 'on_hand_desc', 'available_asc']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantProduct, Inventory, Product, Package } = m;
      const merchantId = req.merchant.id;
      const { page, limit, offset } = parsePagination(req.query);

      // Resolve this merchant's sellable ids.
      const mpRows = await MerchantProduct.findAll({
        where: { merchant_id: merchantId },
        attributes: ['id', 'product_id', 'package_id', 'is_active'],
        raw: true,
      });
      const productIds = mpRows.filter((p) => p.product_id).map((p) => p.product_id);
      const packageIds = mpRows.filter((p) => p.package_id).map((p) => p.package_id);

      const orClauses = [];
      if (productIds.length) {
        orClauses.push({ sellable_type: 'product', sellable_id: { [Op.in]: productIds } });
      }
      if (packageIds.length) {
        orClauses.push({ sellable_type: 'package', sellable_id: { [Op.in]: packageIds } });
      }

      if (!orClauses.length) {
        return res.json(paginatedResponse([], 0, { page, limit }));
      }

      const where = { [Op.or]: orClauses };

      // Availability filter operates on (on_hand - reserved).
      if (req.query.availability) {
        // Built using sequelize.where literal so it composes with the OR.
      }

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
          // available = on_hand - reserved; approximate via on_hand asc.
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

      // Attach catalog + merchant_product rows.
      const involvedProductIds = rows.filter((r) => r.sellable_type === 'product').map((r) => r.sellable_id);
      const involvedPackageIds = rows.filter((r) => r.sellable_type === 'package').map((r) => r.sellable_id);

      const products = involvedProductIds.length
        ? await Product.findAll({ where: { id: { [Op.in]: involvedProductIds } }, raw: true })
        : [];
      const packages = involvedPackageIds.length
        ? await Package.findAll({ where: { id: { [Op.in]: involvedPackageIds } }, raw: true })
        : [];

      const mpBySellable = {};
      for (const mp of mpRows) {
        if (mp.product_id) mpBySellable[`product:${mp.product_id}`] = mp;
        if (mp.package_id) mpBySellable[`package:${mp.package_id}`] = mp;
      }

      let combined = rows.map((inv) => {
        const key = `${inv.sellable_type}:${inv.sellable_id}`;
        const product =
          inv.sellable_type === 'product'
            ? products.find((p) => p.id === inv.sellable_id)
            : packages.find((p) => p.id === inv.sellable_id);
        return { inv, product, mp: mpBySellable[key] || null };
      });

      // availability filter (post-query so we can use computed available).
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

      // text filter on product name/sku
      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
      if (q) {
        combined = combined.filter(
          (c) =>
            c.product &&
            ((c.product.name_ar || '').toLowerCase().includes(q) ||
              (c.product.sku || '').toLowerCase().includes(q) ||
              (c.inv.sku || '').toLowerCase().includes(q)),
        );
      }

      const data = combined.map((c) =>
        serializeInventory(c.inv, c.product, c.mp),
      );

      res.json(paginatedResponse(data, data.length, { page, limit }));
    }),
  );

  return router;
}
