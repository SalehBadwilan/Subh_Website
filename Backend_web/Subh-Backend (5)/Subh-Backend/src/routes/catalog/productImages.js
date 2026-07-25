import { Router } from 'express';
import { body } from 'express-validator';
import fs from 'node:fs';
import path from 'node:path';
import asyncHandler from '../../utils/asyncHandler.js';
import { ApiError, notFound, badRequest } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import authenticate from '../../middleware/auth.js';
import { uploadProductImage, buildImageUrl, UPLOAD_DIR } from '../../middleware/upload.js';

export default function createProductImageRoutes({ models }) {
  const router = Router();
  const { ProductImage, Product } = models;

  /**
   * Serialize a ProductImage row, resolving its stored URL into a stable
   * `image_url` field plus the primary flag. Used by every consumer so the
   * field name stays unified: DB.url → API.image_url.
   */
  const serialize = (img) => ({
    id: img.id,
    product_id: img.product_id,
    image_url: img.url,
    alt_text_ar: img.alt_text_ar,
    sort_order: img.sort_order,
    is_primary: img.is_primary,
  });

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.product_id) where.product_id = req.query.product_id;
      const { rows, count } = await ProductImage.findAndCountAll({
        where,
        limit,
        offset,
        order: [['sort_order', 'ASC']],
      });
      res.json(paginatedResponse(rows.map(serialize), count, { page, limit }));
    }),
  );

  // --- POST /upload -------------------------------------------------------
  // Accepts a multipart/form-data upload: a single image file under field
  // `image`, plus optional `product_id`, `alt_text_ar`, `is_primary`.
  // The file is written to disk (see middleware/upload.js) and a ProductImage
  // row is created with the served URL. Auth required (catalog edits are an
  // admin/merchant action — guests cannot upload).
  //
  // When replacing a product's primary image, callers can set is_primary=true;
  // any prior primary image for that product is demoted in the same request so
  // there is exactly one primary at a time (matches the DB partial unique index).
  router.post(
    '/upload',
    authenticate(),
    uploadProductImage,
    asyncHandler(async (req, res) => {
      if (!req.file) {
        throw badRequest('لم يتم استلام أي ملف صورة', { code: 'no_file' });
      }

      const productId = req.body?.product_id;
      const altText = req.body?.alt_text_ar || null;
      const wantPrimary = String(req.body?.is_primary ?? 'true') === 'true';

      // If a product_id was supplied, it must reference an existing product —
      // otherwise the FK would reject the insert with an opaque error.
      if (productId) {
        const product = await Product.findByPk(productId);
        if (!product) {
          // Clean up the just-written orphan file so disk does not fill with
          // unlinked uploads when clients send a bad product_id.
          try {
            await fs.promises.unlink(req.file.path);
          } catch {
            /* best-effort */
          }
          throw notFound('Product');
        }
      } else if (!productId && wantPrimary) {
        // A primary image requires a product to belong to.
        throw badRequest('product_id مطلوب عند تعيين الصورة كأساسية', {
          code: 'primary_needs_product',
        });
      }

      const imageUrl = buildImageUrl(req.file.filename, req);

      // Enforce single-primary per product: demote any existing primary for
      // this product before inserting the new primary row.
      if (productId && wantPrimary) {
        await ProductImage.update(
          { is_primary: false },
          { where: { product_id: productId, is_primary: true } },
        );
      }

      const img = await ProductImage.create({
        product_id: productId,
        url: imageUrl,
        alt_text_ar: altText,
        is_primary: productId ? wantPrimary : false,
        sort_order: 0,
      });

      res.status(201).json({ ok: true, data: serialize(img) });
    }),
  );

  // --- DELETE /:id — also remove the on-disk file when it's a local upload.
  // (Supabase-hosted URLs are left untouched; we only unlink files we own.)

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const img = await ProductImage.findByPk(req.params.id);
      if (!img) throw notFound('ProductImage');
      res.json({ ok: true, data: serialize(img) });
    }),
  );

  // POST / — create an image row from an already-hosted URL (kept for
  // programmatic / Supabase-storage workflows that don't go through /upload).
  router.post(
    '/',
    [
      body('product_id').isUUID().withMessage('product_id required'),
      body('url').isURL().withMessage('url must be a valid URL'),
      body('alt_text_ar').optional().isString(),
      body('sort_order').optional().isInt({ min: 0 }),
      body('is_primary').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const img = await ProductImage.create(req.body);
      res.status(201).json({ ok: true, data: serialize(img) });
    }),
  );

  router.put(
    '/:id',
    [
      body('url').optional().isURL(),
      body('alt_text_ar').optional().isString(),
      body('sort_order').optional().isInt({ min: 0 }),
      body('is_primary').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const img = await ProductImage.findByPk(req.params.id);
      if (!img) throw notFound('ProductImage');
      await img.update(req.body);
      res.json({ ok: true, data: serialize(img) });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const img = await ProductImage.findByPk(req.params.id);
      if (!img) throw notFound('ProductImage');
      // Remove the on-disk file too, but ONLY if it's a locally-served upload.
      // Detect by the /uploads/products/ path segment (works for both absolute
      // http://host/uploads/... and legacy relative /uploads/... URLs).
      // External URLs (e.g. Supabase) are left intact.
      if (img.url && img.url.includes('/uploads/products/')) {
        const filename = path.basename(img.url);
        try {
          await fs.promises.unlink(path.join(UPLOAD_DIR, filename));
        } catch {
          /* best-effort: row removal must not fail on a missing file */
        }
      }
      await img.destroy();
      res.json({ ok: true, message: 'ProductImage deleted' });
    }),
  );

  return router;
}
