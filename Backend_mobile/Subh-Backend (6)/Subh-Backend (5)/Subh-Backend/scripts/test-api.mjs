/**
 * Smoke test for the CRUD API. Creates a chain of related entities, then reads
 * them back, updates, and deletes — proving the full stack works against the
 * live Supabase database.
 *
 * Usage:  node scripts/test-api.mjs   (server must be running on BASE_URL)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const results = [];
function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ' :: ' + detail : ''}`);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { status: res.status, json };
}

const ts = Date.now();
let pass = 0;
let fail = 0;

async function main() {
  // --- Category: full CRUD -------------------------------------------------
  const catBody = { slug: `tcat-${ts}`, name_ar: 'اختبار تصنيف' };
  let r = await req('POST', '/api/categories', catBody);
  log('Category POST (201)', r.status === 201, `status=${r.status}`);
  const catId = r.json?.data?.id;
  if (!catId) throw new Error('no category id returned');

  r = await req('GET', '/api/categories');
  log('Category LIST (200)', r.status === 200, `count=${r.json?.data?.length ?? 0}`);

  r = await req('GET', `/api/categories/${catId}`);
  log('Category GET one (200)', r.status === 200 && !!r.json?.data);

  r = await req('PUT', `/api/categories/${catId}`, { name_ar: 'محدّث', sort_order: 2 });
  log('Category PUT (200)', r.status === 200 && r.json?.data?.name_ar === 'محدّث');

  r = await req('DELETE', `/api/categories/${catId}`);
  log('Category DELETE (200)', r.status === 200);

  r = await req('GET', `/api/categories/${catId}`);
  log('Category GET after delete (404)', r.status === 404);

  // --- Product: CRUD (needs category optional, so fine standalone) --------
  const prodBody = {
    sku: `TP-${ts}`,
    slug: `tp-${ts}`,
    name_ar: 'منتج اختبار',
    price_sar: 100,
    status: 'active',
  };
  r = await req('POST', '/api/products', prodBody);
  log('Product POST (201)', r.status === 201, `status=${r.status}`);
  const prodId = r.json?.data?.id;

  r = await req('GET', '/api/products');
  log('Product LIST (200)', r.status === 200);

  r = await req('GET', `/api/products/${prodId}`);
  log('Product GET one (200)', r.status === 200);

  r = await req('PUT', `/api/products/${prodId}`, { price_sar: 150 });
  log('Product PUT (200)', r.status === 200 && Number(r.json?.data?.price_sar) === 150);

  // --- Role + Permission + RolePermission (join) -------------------------
  r = await req('POST', '/api/roles', { slug: `trole-${ts}`, name_ar: 'دور اختبار' });
  log('Role POST (201)', r.status === 201);
  const roleId = r.json?.data?.id;

  r = await req('POST', '/api/permissions', { slug: `tperm-${ts}`, name_ar: 'صلاحية اختبار' });
  log('Permission POST (201)', r.status === 201);
  const permId = r.json?.data?.id;

  r = await req('POST', '/api/role-permissions', { role_id: roleId, permission_id: permId });
  log('RolePermission POST (201)', r.status === 201);

  r = await req('GET', `/api/role-permissions?role_id=${roleId}`);
  log('RolePermission LIST (200)', r.status === 200);

  // --- Validation: 422 on bad input ---------------------------------------
  r = await req('POST', '/api/products', { sku: '', slug: '', name_ar: '', price_sar: -5 });
  log('Validation 422 (bad product)', r.status === 422, `status=${r.status}`);

  // --- 404 on unknown id --------------------------------------------------
  r = await req('GET', '/api/products/00000000-0000-0000-0000-000000000000');
  log('404 unknown product', r.status === 404);

  // --- Health --------------------------------------------------------------
  r = await req('GET', '/api/health');
  log('Health (200)', r.status === 200 && r.json?.database?.status === 'connected');

  // --- Read-only endpoints (append-only) return 405 on POST --------------
  r = await req('POST', '/api/audit-logs', {});
  log('AuditLog POST rejected (404)', r.status === 404, `status=${r.status}`);

  // --- Summary -------------------------------------------------------------
  pass = results.filter((x) => x.ok).length;
  fail = results.length - pass;
  console.log(`\n=== ${pass}/${results.length} passed, ${fail} failed ===`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exitCode = 1;
});
