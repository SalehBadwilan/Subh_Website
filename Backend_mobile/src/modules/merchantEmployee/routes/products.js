/**
 * GET /api/merchant-employee/products
 *
 * Read-only list of the products/packages the employee's merchant is
 * authorized to sell, with live inventory. Mirrors the merchant route shape so
 * the employee UI can reuse components. No mutations — employees never edit the
 * catalog (subh-owned) and update-requests are owner/manager only.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { serializeProduct } from '../../merchant/utils/serializers.js';

export default function createEmployeeProductRoutes() {
  const router = Router();

  router.get(
    '/',
    [
      query('status').optional().isIn(['active', 'inactive']),
      query('q').optional().isString().trim().isLength({ max: 100 }),
      query('sort').optional().isIn(['newest', 'name', 'price_asc', 'price_desc']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantProduct, Product, Package, Inventory, ProductImage } = m;
      const merchantId = req.merchant.id;
      const { page, limit, offset } = parsePagination(req.query);

      const mpWhere = { merchant_id: merchantId };
      if (req.query.status === 'active') mpWhere.is_active = true;
      if (req.query.status === 'inactive') mpWhere.is_active = false;

      const { rows: mpRows } = await MerchantProduct.findAndCountAll({
        where: mpWhere,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
      });

      const productIds = mpRows.map((r) => r.product_id).filter(Boolean);
      const packageIds = mpRows.map((r) => r.package_id).filter(Boolean);

      const products = productIds.length
        ? await Product.findAll({ where: { id: { [Op.in]: productIds } }, raw: true })
        : [];
      const packages = packageIds.length
        ? await Package.findAll({ where: { id: { [Op.in]: packageIds } }, raw: true })
        : [];

      // Fetch the product image gallery and attach it to each product row so
      // the shared serializer can resolve image_url + images.
      let imagesMap = {};
      if (productIds.length) {
        const imgRows = await ProductImage.findAll({
          where: { product_id: { [Op.in]: productIds } },
          attributes: ['id', 'product_id', 'url', 'alt_text_ar', 'is_primary', 'sort_order'],
          order: [['is_primary', 'DESC'], ['sort_order', 'ASC'], ['created_at', 'ASC']],
          raw: true,
        });
        for (const r of imgRows) {
          if (!imagesMap[r.product_id]) imagesMap[r.product_id] = [];
          imagesMap[r.product_id].push({
            id: r.id,
            url: r.url,
            alt_text_ar: r.alt_text_ar,
            is_primary: r.is_primary,
          });
        }
      }

      // Inventory map.
      const orClauses = [];
      if (productIds.length) orClauses.push({ sellable_type: 'product', sellable_id: { [Op.in]: productIds } });
      if (packageIds.length) orClauses.push({ sellable_type: 'package', sellable_id: { [Op.in]: packageIds } });
      let invMap = {};
      if (orClauses.length) {
        const invRows = await Inventory.findAll({
          where: { [Op.or]: orClauses },
          attributes: ['sellable_type', 'sellable_id', 'on_hand', 'reserved', 'reorder_threshold'],
          raw: true,
        });
        for (const r of invRows) {
          invMap[`${r.sellable_type}:${r.sellable_id}`] = {
            on_hand: r.on_hand,
            reserved: r.reserved,
            available: Math.max(0, (r.on_hand || 0) - (r.reserved || 0)),
            reorder_threshold: r.reorder_threshold,
          };
        }
      }

      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
      const sortBy = req.query.sort || 'newest';

      let combined = mpRows
        .map((mp) => {
          const product = mp.product_id
            ? products.find((p) => p.id === mp.product_id)
            : packages.find((p) => p.id === mp.package_id);
          const key = mp.product_id ? `product:${mp.product_id}` : `package:${mp.package_id}`;
          // Attach the image gallery so the shared serializer can resolve
          // image_url + images for the employee UI.
          if (product && mp.product_id) {
            product.ProductImages = imagesMap[mp.product_id] || [];
          }
          return { mp, product, inventory: invMap[key] || null };
        })
        .filter((c) => c.product);

      if (q) {
        combined = combined.filter(
          (c) =>
            (c.product.name_ar || '').toLowerCase().includes(q) ||
            (c.product.sku || '').toLowerCase().includes(q),
        );
      }

      combined.sort((a, b) => {
        switch (sortBy) {
          case 'price_asc':
            return Number(a.product.price_sar) - Number(b.product.price_sar);
          case 'price_desc':
            return Number(b.product.price_sar) - Number(a.product.price_sar);
          case 'name':
            return String(a.product.name_ar).localeCompare(String(b.product.name_ar), 'ar');
          case 'newest':
          default:
            return new Date(b.mp.created_at) - new Date(a.mp.created_at);
        }
      });

      const data = combined.map((c) =>
        serializeProduct(c.product, {
          merchantProductId: c.mp.id,
          isActive: c.mp.is_active,
          inventory: c.inventory,
        }),
      );

      res.json(paginatedResponse(data, data.length, { page, limit }));
    }),
  );

  return router;
}
