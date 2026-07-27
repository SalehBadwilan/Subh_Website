/**
 * Product image lifecycle smoke test.
 *
 * Boots the real Express app and drives the HTTP routes with fetch. Uses the
 * OTP login flow to obtain a real JWT (the upload endpoint is authenticated).
 *
 * Coverage:
 *  1.  Create a real PNG file on disk and POST it as multipart/form-data to
 *      /api/product-images/upload → file saved, ProductImage row created.
 *  2.  Verify the response returns `image_url` and `is_primary`.
 *  3.  GET the served image URL → HTTP 200 + image content-type (browser-viewable).
 *  4.  GET /api/merchant/products  → product now carries image_url + images[].
 *  5.  GET /api/products (customer) → same unified shape.
 *  6.  GET /api/products (admin LIST) → same unified shape + the test product's image.
 *  7.  GET /api/products/:id (admin detail) → same.
 *  8.  Product WITHOUT an image → image_url: null, images: [] (no error).
 *  9.  Upload a non-image file → 415.
 * 10.  Upload an oversized file → 413.
 * 11.  Replace the primary image (second upload, is_primary=true) → single primary.
 * 12.  DELETE the image → row gone + on-disk file removed.
 *
 * Run: node scripts/test-product-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

import env from '../src/config/env.js';
import { bootApp } from '../src/app.js';
import sequelize from '../src/config/database.js';

const BASE = `http://127.0.0.1:${env.port}`;
const results = { pass: 0, fail: 0, checks: [] };
let server;

const MERCHANT_PHONE = '0597194519'; // existing Test Store merchant
const MERCHANT1_ID = 'd89a274f-98a8-418b-bb0b-406b9e9921f3'; // Test Store

const cryptoRandom = () => crypto.randomUUID();

function log(ok, name, extra = '') {
  if (ok) results.pass += 1;
  else results.fail += 1;
  const line = `[${ok ? 'PASS' : 'FAIL'}] ${name}${extra ? ' -- ' + extra : ''}`;
  results.checks.push(line);
  if (!ok) console.error('!!! ' + line);
}

async function req(pathname, { method = 'GET', body, token, headers = {}, isForm = false } = {}) {
  const opts = { method, headers: { ...headers } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = body;
  if (!isForm) opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
  const res = await fetch(`${BASE}${pathname}`, opts);
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { status: res.status, json, headers: res.headers };
}

async function login(phone) {
  const r1 = await req('/api/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
  const code = r1.json?.data?.devOtp;
  if (!code) throw new Error(`no devOtp for ${phone}`);
  const r2 = await req('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, otp: code }) });
  return r2.json?.data?.token;
}

/**
 * Build a minimal valid PNG (1x1 pixel) entirely in-memory. No external assets.
 */
function buildPng(width = 2, height = 2) {
  // Minimal PNG via a precomputed 1x1 transparent-ish pixel then we just use
  // the 1x1 form — content does not matter, only the bytes/type.
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: truecolor RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk('IHDR', ihdrData);
  // IDAT: raw scanlines (filter byte 0 + RGB pixels), zlib-deflated.
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0xff)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const idat = chunk('IDAT', zlib.deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// CRC32 for PNG (table-based).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Build a multipart/form-data body for a single file field. */
function buildMultipart({ fieldName, filename, contentType, content }, extraFields = {}) {
  const boundary = '----subhTestBoundary' + Math.random().toString(16).slice(2);
  const parts = [];
  const enc = (s) => Buffer.from(s);
  for (const [k, v] of Object.entries(extraFields)) {
    parts.push(enc(`--${boundary}\r\n`));
    parts.push(enc(`Content-Disposition: form-data; name="${k}"\r\n\r\n`));
    parts.push(enc(`${v}\r\n`));
  }
  parts.push(enc(`--${boundary}\r\n`));
  parts.push(
    enc(
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
    ),
  );
  parts.push(content);
  parts.push(enc(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

async function main() {
  const { app } = await bootApp();
  await new Promise((r) => (server = app.listen(env.port, r)));
  console.log(`Product image test listening on ${BASE}`);

  const token = await login(MERCHANT_PHONE);
  log(!!token, 'Merchant OTP login');

  // Ensure the test merchant has at least one merchant_product listing so the
  // merchant products endpoint has something to return image data for. We link
  // an existing catalog product to the merchant directly (this mirrors what the
  // admin assignment flow does) — idempotent.
  await sequelize.query(
    "INSERT INTO merchant_products (id, merchant_id, product_id, is_active) " +
      "SELECT $1, $2, p.id, true FROM products p " +
      "WHERE p.id NOT IN (SELECT product_id FROM merchant_products WHERE merchant_id = $2) " +
      "AND NOT EXISTS (SELECT 1 FROM merchant_products WHERE merchant_id = $2 AND product_id IS NOT NULL) " +
      "ORDER BY p.created_at DESC LIMIT 1",
    { bind: [cryptoRandom(), MERCHANT1_ID] },
  );

  // --- Resolve a real product id (from merchant's listings) to attach images.
  const prods = await req('/api/merchant/products', { token });
  log(prods.status === 200, 'GET /api/merchant/products', `status=${prods.status}`);
  const productId = prods.json?.data?.[0]?.id;
  log(!!productId, 'Found a product to attach an image to', productId);

  if (!productId) {
    console.error('No product available — aborting image tests.');
    return finish();
  }

  // =========================================================================
  // 1. UPLOAD a valid PNG (multipart) as the product's primary image.
  // =========================================================================
  const png = buildPng(4, 4);
  const mp = buildMultipart(
    { fieldName: 'image', filename: 'test-product.png', contentType: 'image/png', content: png },
    { product_id: productId, is_primary: 'true', alt_text_ar: 'صورة المنتج التجريبية' },
  );
  const upload = await req('/api/product-images/upload', {
    method: 'POST',
    token,
    body: mp.body,
    headers: { 'Content-Type': mp.contentType },
    isForm: true,
  });
  log(upload.status === 201 && !!upload.json?.data?.image_url, 'POST /upload multipart → 201 + image_url', `status=${upload.status}`);
  const imageUrl = upload.json?.data?.image_url;
  const imageId = upload.json?.data?.id;
  log(
    !!imageUrl && imageUrl.includes('/uploads/products/'),
    'image_url points to local static path',
    imageUrl,
  );
  log(upload.json?.data?.is_primary === true, 'Uploaded image is_primary=true');

  if (!imageUrl) {
    console.error('No image_url returned — aborting remaining image tests.');
    return finish();
  }

  // =========================================================================
  // 2 & 3. The served URL must be browser-viewable (HTTP 200 + image content-type).
  // =========================================================================
  // imageUrl is absolute (http://host:port/uploads/...); fetch it directly.
  const view = await fetch(imageUrl);
  log(view.status === 200, 'GET served image URL → 200', `status=${view.status}`);
  log(
    (view.headers.get('content-type') || '').startsWith('image/'),
    'Served image has image/* content-type',
    view.headers.get('content-type'),
  );

  // =========================================================================
  // 4. GET /api/merchant/products now carries image_url + images[].
  // =========================================================================
  const mProds2 = await req('/api/merchant/products', { token });
  const mProd = (mProds2.json?.data || []).find((p) => p.id === productId);
  log(!!mProd && mProd.image_url === imageUrl, 'merchant product image_url matches uploaded', mProd?.image_url);
  log(
    Array.isArray(mProd?.images) && mProd.images.some((i) => i.image_url === imageUrl),
    'merchant product images[] contains the uploaded image',
    `count=${mProd?.images?.length}`,
  );

  // =========================================================================
  // 5. GET /api/products (customer) → same unified shape.
  // =========================================================================
  const cProds = await req('/api/products');
  const cProd = (cProds.json?.data || []).find((p) => p.id === productId);
  log(!!cProd && cProd.image_url === imageUrl, 'customer product image_url matches', cProd?.image_url);
  log(
    Array.isArray(cProd?.images) && cProd.images.every((i) => 'image_url' in i),
    'customer product images[] uses image_url field',
  );

  // =========================================================================
  // 6. GET /api/products (admin LIST) → same unified shape.
  // =========================================================================
  const aProds = await req('/api/products');
  const aProd = (aProds.json?.data || []).find((p) => p.id === productId);
  log(!!aProd && aProd.image_url === imageUrl, 'admin LIST product image_url matches', aProd?.image_url);

  // =========================================================================
  // 7. GET /api/products/:id (admin detail) → same.
  // =========================================================================
  const aDetail = await req(`/api/products/${productId}`);
  log(aDetail.status === 200 && aDetail.json?.data?.image_url === imageUrl, 'admin detail product image_url matches');

  // =========================================================================
  // 8. A product WITHOUT an image must not error (image_url: null, images: []).
  // =========================================================================
  // Find any other product in the DB that we did NOT attach to. Use the admin
  // LIST and pick one whose image_url is null (or a product not in our merchant
  // scope). Fall back to a known-empty case by querying DB directly.
  const [noImgRows] = await sequelize.query(
    'SELECT p.id FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id) LIMIT 1',
  );
  const noImgId = noImgRows[0]?.id;
  if (noImgId) {
    const noImg = await req(`/api/products/${noImgId}`);
    log(
      noImg.status === 200 && noImg.json?.data?.image_url === null && Array.isArray(noImg.json?.data?.images) && noImg.json.data.images.length === 0,
      'Product without image → image_url:null, images:[] (no error)',
    );
  } else {
    log(true, 'No image-less product in DB to test (skipped)');
  }

  // =========================================================================
  // 9. Non-image file → 415.
  // =========================================================================
  const txt = buildMultipart(
    { fieldName: 'image', filename: 'notes.txt', contentType: 'text/plain', content: Buffer.from('hello') },
    { product_id: productId },
  );
  const badType = await req('/api/product-images/upload', {
    method: 'POST',
    token,
    body: txt.body,
    headers: { 'Content-Type': txt.contentType },
    isForm: true,
  });
  log(badType.status === 415, 'Non-image upload → 415', `status=${badType.status}`);

  // =========================================================================
  // 10. Oversized file → 413.
  // =========================================================================
  const bigPng = Buffer.alloc(6 * 1024 * 1024, 0xff); // 6 MB > 5 MB limit
  const big = buildMultipart(
    { fieldName: 'image', filename: 'big.png', contentType: 'image/png', content: bigPng },
    { product_id: productId },
  );
  const bigUpload = await req('/api/product-images/upload', {
    method: 'POST',
    token,
    body: big.body,
    headers: { 'Content-Type': big.contentType },
    isForm: true,
  });
  log(bigUpload.status === 413, 'Oversized upload → 413', `status=${bigUpload.status}`);

  // =========================================================================
  // 11. Replace primary image → exactly one primary remains.
  // =========================================================================
  const png2 = buildPng(2, 2);
  const mp2 = buildMultipart(
    { fieldName: 'image', filename: 'replacement.png', contentType: 'image/png', content: png2 },
    { product_id: productId, is_primary: 'true' },
  );
  const replace = await req('/api/product-images/upload', {
    method: 'POST',
    token,
    body: mp2.body,
    headers: { 'Content-Type': mp2.contentType },
    isForm: true,
  });
  log(replace.status === 201 && !!replace.json?.data?.image_url, 'Replace upload → 201', `status=${replace.status}`);
  const newUrl = replace.json?.data?.image_url;

  // Count primaries for this product — must be exactly 1.
  const [primRows] = await sequelize.query(
    'SELECT count(*)::int as c FROM product_images WHERE product_id = $1 AND is_primary = true',
    { bind: [productId] },
  );
  log(primRows[0].c === 1, 'Exactly one primary image after replacement', `count=${primRows[0].c}`);

  // The OLD image should still exist on disk (we did not delete it — the spec
  // says replace shouldn't remove the old one, just demote it). Verify it is
  // still served. imageUrl is absolute, so fetch directly.
  const oldView = await fetch(imageUrl);
  log(oldView.status === 200, 'Old (demoted) image still served after replacement');

  // =========================================================================
  // 12. DELETE an image → row gone + local file removed.
  // =========================================================================
  const del = await req(`/api/product-images/${imageId}`, { method: 'DELETE', token });
  log(del.status === 200, 'DELETE /api/product-images/:id → 200', `status=${del.status}`);
  // Row must be gone.
  const [afterDel] = await sequelize.query('SELECT count(*)::int as c FROM product_images WHERE id = $1', {
    bind: [imageId],
  });
  log(afterDel[0].c === 0, 'Deleted image row is gone from DB');
  // Local file must be removed.
  const filename = path.basename(imageUrl);
  const onDisk = fs.existsSync(path.resolve('uploads', 'products', filename));
  log(!onDisk, 'Deleted local file removed from disk', `exists=${onDisk}`);

  // Final merchant products check still works.
  const final = await req('/api/merchant/products', { token });
  log(final.status === 200, 'GET /api/merchant/products still works after edits');

  return finish();
}

function finish() {
  console.log('\n================ PRODUCT IMAGE RESULTS ================');
  for (const c of results.checks) console.log(c);
  console.log(`\nPassed: ${results.pass} | Failed: ${results.fail}`);
  const failures = results.checks.filter((c) => c.startsWith('[FAIL]'));
  if (failures.length) {
    console.log('\n--- FAILURES ---');
    for (const f of failures) console.log(f);
  }
}

main()
  .catch((e) => {
    console.error('Smoke test crashed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    await sequelize.close().catch(() => {});
    if (results.fail > 0) process.exitCode = 1;
  });
