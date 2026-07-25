/**
 * Merchant product routes.
 *
 *   GET  /api/merchant/products
 *        List the products/packages this merchant is authorized to sell
 *        (MerchantProduct join → Product/Package), with live inventory + the
 *        merchant's last pending update request for each. Paginated, filterable,
 *        sortable.
 *
 *   POST /api/merchant/products/:id/update-request
 *        Submit a request to change a catalog item. The merchant CANNOT edit
 *        the catalog directly — it only proposes a change (JSONB patch blob)
 *        which Subh reviews. The :id here is the MerchantProduct.id (the
 *        merchant's own listing), and ownership is enforced.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, badRequest, notFound } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import { serializeProduct, serializeUpdateRequest } from '../utils/serializers.js';

export default function createMerchantProductRoutes() {
  const router = Router();

  /**
   * Build an inventory availability map keyed by `${type}:${sellableId}`.
   */
  const fetchInventoryMap = async (Inventory, clauses) => {
    if (!clauses.productIds.length && !clauses.packageIds.length) return {};
    const orClauses = [];
    if (clauses.productIds.length) {
      orClauses.push({ sellable_type: 'product', sellable_id: { [Op.in]: clauses.productIds } });
    }
    if (clauses.packageIds.length) {
      orClauses.push({ sellable_type: 'package', sellable_id: { [Op.in]: clauses.packageIds } });
    }
    const rows = await Inventory.findAll({
      where: { [Op.or]: orClauses },
      attributes: ['sellable_type', 'sellable_id', 'on_hand', 'reserved', 'reorder_threshold'],
      raw: true,
    });
    const map = {};
    for (const r of rows) {
      map[`${r.sellable_type}:${r.sellable_id}`] = {
        on_hand: r.on_hand,
        reserved: r.reserved,
        available: Math.max(0, (r.on_hand || 0) - (r.reserved || 0)),
        reorder_threshold: r.reorder_threshold,
      };
    }
    return map;
  };

  /**
   * Fetch product images for a list of product ids, keyed by product_id, with
   * the primary image first. Used to attach a gallery to each catalog row.
   */
  const fetchImagesMap = async (ProductImage, productIds) => {
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

  // --- GET /api/merchant/products -----------------------------------------
  router.get(
    '/',
    [
      query('status').optional().isIn(['active', 'inactive']),
      query('q').optional().isString().trim().isLength({ max: 100 }),
      query('sellable_type').optional().isIn(['product', 'package']),
      query('low_stock').optional().isBoolean().toBoolean(),
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

      // Base filter: only this merchant's listings.
      const mpWhere = { merchant_id: merchantId };
      if (req.query.status === 'active') mpWhere.is_active = true;
      if (req.query.status === 'inactive') mpWhere.is_active = false;
      if (req.query.sellable_type) {
        if (req.query.sellable_type === 'product') mpWhere.product_id = { [Op.not]: null };
        else mpWhere.package_id = { [Op.not]: null };
      }

      const { rows: mpRows, count } = await MerchantProduct.findAndCountAll({
        where: mpWhere,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
      });

      // Eager-load the underlying Product/Package for each listing.
      const productIds = mpRows.map((r) => r.product_id).filter(Boolean);
      const packageIds = mpRows.map((r) => r.package_id).filter(Boolean);

      const products = productIds.length
        ? await Product.findAll({ where: { id: { [Op.in]: productIds } }, raw: true })
        : [];
      const packages = packageIds.length
        ? await Package.findAll({ where: { id: { [Op.in]: packageIds } }, raw: true })
        : [];

      const inventoryMap = await fetchInventoryMap(Inventory, { productIds, packageIds });

      // Fetch the product image gallery and attach it to each product row so
      // serializeProduct can resolve `image_url` + `images`. Packages don't have
      // a gallery in the schema, so we only resolve images for products.
      const imagesMap = await fetchImagesMap(ProductImage, productIds);

      // Apply text + price filters client-side over the resolved catalog rows
      // (the filter is across catalog fields, not MerchantProduct fields).
      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
      const lowStockOnly = req.query.low_stock === true;
      const sortBy = req.query.sort || 'newest';

      let combined = mpRows.map((mp) => {
        const product = mp.product_id
          ? products.find((p) => p.id === mp.product_id)
          : packages.find((p) => p.id === mp.package_id);
        const key = mp.product_id ? `product:${mp.product_id}` : `package:${mp.package_id}`;
        // Attach the image gallery (if any) onto the product row so the shared
        // serializer (which reads p.ProductImages) can resolve image_url/images.
        if (product && mp.product_id) {
          product.ProductImages = imagesMap[mp.product_id] || [];
        }
        return {
          mp,
          product,
          inventory: inventoryMap[key] || null,
        };
      });

      // Filter out listings whose underlying catalog row was hard-deleted.
      combined = combined.filter((c) => c.product);

      if (q) {
        combined = combined.filter(
          (c) =>
            (c.product.name_ar || '').toLowerCase().includes(q) ||
            (c.product.sku || '').toLowerCase().includes(q) ||
            (c.product.slug || '').toLowerCase().includes(q),
        );
      }

      if (lowStockOnly) {
        combined = combined.filter(
          (c) => c.inventory && c.inventory.available <= (c.inventory.reorder_threshold || 0),
        );
      }

      // Sort (price/name operate on the catalog row; newest on MerchantProduct).
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

      // Note: count is the pre-filter MerchantProduct count; we expose the
      // post-filter length as the true total for the current page's filter set.
      res.json(paginatedResponse(data, data.length, { page, limit }));
    }),
  );

  // --- POST /api/merchant/products/:id/update-request ---------------------
  // :id = MerchantProduct.id belonging to THIS merchant.
  router.post(
    '/:id/update-request',
    [
      body('requested_change')
        .isObject()
        .withMessage('requested_change يجب أن يكون كائنًا (JSON object)'),
      body('reason_ar').optional().isString().isLength({ max: 2000 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { MerchantProduct, ProductUpdateRequest } = m;
      const merchantId = req.merchant.id;

      // Resolve the listing — MUST belong to this merchant (else 404, not 403,
      // to avoid leaking the existence of other merchants' listings).
      const mp = await MerchantProduct.findOne({
        where: { id: req.params.id, merchant_id: merchantId },
      });
      if (!mp) throw notFound('MerchantProduct');

      const change = req.body.requested_change;
      if (Object.keys(change).length === 0) {
        throw badRequest('requested_change لا يمكن أن يكون فارغًا');
      }

      // Whitelist the keys a merchant may propose changing (defence in depth).
      const ALLOWED_KEYS = new Set([
        'price_sar',
        'vat_rate',
        'name_ar',
        'description_ar',
        'status',
        'weight_grams',
      ]);
      const invalidKeys = Object.keys(change).filter((k) => !ALLOWED_KEYS.has(k));
      if (invalidKeys.length) {
        throw badRequest('بعض الحقول غير مسموح بتعديلها عبر طلب التحديث', { fields: invalidKeys });
      }

      // One active request per listing to avoid duplicates piling up.
      const existing = await ProductUpdateRequest.findOne({
        where: {
          merchant_id: merchantId,
          merchant_product_id: mp.id,
          status: { [Op.in]: ['pending', 'under_review'] },
        },
      });
      if (existing) {
        throw new ApiError(409, 'يوجد طلب تحديث قيد المراجعة لهذا المنتج بالفعل', {
          code: 'pending_request_exists',
          request_id: existing.id,
        });
      }

      const created = await ProductUpdateRequest.create({
        merchant_id: merchantId,
        merchant_product_id: mp.id,
        product_id: mp.product_id,
        package_id: mp.package_id,
        requested_change: change,
        reason_ar: req.body.reason_ar || null,
        requested_by: req.user.id,
        status: 'pending',
      });

      res.status(201).json({ ok: true, data: serializeUpdateRequest(created) });
    }),
  );

  return router;
}
