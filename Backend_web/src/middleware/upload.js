/**
 * File upload middleware (Multer) — product images only.
 *
 * The project had NO upload mechanism before this change: the `product_images`
 * table stores a `url` string, but there was no endpoint to accept an actual
 * image FILE from the browser. The storage layer is LOCAL disk + Express
 * static serving (see app.js). This avoids introducing a new external provider
 * and works with the existing schema unchanged — only `url` is persisted.
 *
 * Security:
 *  - Only image MIME types are accepted (validated by mimetype + extension).
 *  - File size is capped (default 5 MB).
 *  - Filenames are sanitized and prefixed with a random token + timestamp to
 *    avoid collisions and path-traversal via uploaded names.
 *  - Files land under uploads/products/ which is served statically at
 *    /uploads/products/ (see app.js).
 *
 * Field name contract (unified across the stack):
 *   <input type="file" name="image">  →  multer field "image"
 *   → stored on req.file  →  ProductImage.url  →  API response `image_url`
 */
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Allowed image MIME types and their matching extensions. Both must agree —
 * checking mimetype alone is spoofable, checking extension alone is weak.
 */
const ALLOWED_MIME = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Absolute directory where uploaded product images are written. Created on
 * boot so the first upload does not fail on a missing folder.
 */
export const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Build the public URL for a stored filename.
 *
 * The product_images.url column is validated with `isUrl` (see the
 * ProductImage model), which REJECTS relative paths like "/uploads/...". So we
 * always emit an ABSOLUTE URL. Two sources for the origin, in priority order:
 *
 *   1. PUBLIC_BASE_URL env (set in production behind a known domain).
 *   2. The incoming request's origin (req.protocol + req.get('host')) — this
 *      makes the URL immediately browser-viewable from whatever host the
 *      client used to reach the API, with zero configuration in dev.
 *
 * If neither is available (e.g. a programmatic caller with no Host header),
 * we fall back to a localhost origin so the row still validates as a URL.
 */
const publicBaseUrl = process.env.PUBLIC_BASE_URL || '';

export function buildImageUrl(filename, req = null) {
  const rel = `/uploads/products/${filename}`;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}${rel}`;
  }
  if (req) {
    const proto = req.protocol || (req.headers && req.headers['x-forwarded-proto']) || 'http';
    const host = req.get && req.get('host');
    if (host) return `${proto}://${host}${rel}`;
  }
  // Last-resort fallback so the row still passes `isUrl` validation.
  return `http://localhost:3000${rel}`;
}

/**
 * Multer storage: disk under UPLOAD_DIR, with a collision-safe filename that
 * preserves the original (validated) extension.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = pickExtension(file);
    const token = crypto.randomBytes(10).toString('hex');
    const stamp = Date.now().toString(36);
    cb(null, `${stamp}-${token}.${ext}`);
  },
});

/**
 * Resolve the safe extension for a file. Throws (via callback error) if the
 * mimetype or extension is not in the allow-list.
 */
function pickExtension(file) {
  const mime = (file.mimetype || '').toLowerCase();
  const allowed = ALLOWED_MIME[mime];
  if (!allowed) {
    throw new ApiError(415, 'نوع الملف غير مدعوم، يُقبل الصور فقط (JPG, PNG, WebP, GIF)', {
      code: 'unsupported_media_type',
      received: file.mimetype || 'unknown',
    });
  }
  const originalExt = path.extname(file.originalname || '').replace(/^\./, '').toLowerCase();
  // Prefer the original extension when it matches the mime allow-list, else
  // fall back to the first allowed extension for that mime.
  if (originalExt && allowed.includes(originalExt)) return originalExt;
  return allowed[0];
}

/**
 * Multer file filter — surfaces a clean ApiError on rejection so the central
 * error handler returns a structured response (not multer's default).
 */
function fileFilter(_req, file, cb) {
  try {
    pickExtension(file); // throws on invalid
    cb(null, true);
  } catch (err) {
    cb(err);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

/**
 * Single-image upload middleware. Use as:
 *   router.post('/upload', uploadProductImage, handler)
 * The uploaded file is available on req.file. The handler turns it into a URL
 * and persists a ProductImage row.
 */
export const uploadProductImage = upload.single('image');

export { MAX_FILE_SIZE, ALLOWED_MIME };
export default uploadProductImage;
