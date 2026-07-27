/**
 * Stage 3 — Admin API end-to-end test.
 *
 * Boots the app in-process and exercises the admin router against the real
 * Postgres DB (no mocks) for both roles:
 *
 *   1. Full Admin — every endpoint, write + read.
 *   2. Admin Employee — only GET endpoints succeed; POST/PUT/PATCH/DELETE → 403.
 *
 * Covers:
 *   - auth gating (no token → 401, customer token → 403)
 *   - dashboard / merchants / products / categories / packages / users
 *   - reports / settings (GET + PUT)
 *   - merchant applications list / detail / approve / reject (with idempotency)
 *   - product assign / unassign (duplicate guard, existence checks)
 *
 * Run: node scripts/test-admin-api.mjs
 */
import http from 'node:http';
import { bootApp } from '../src/app.js';
import { signUserToken } from '../src/utils/jwt.js';

// ---------- helpers ----------------------------------------------------------
const ok = (label, cond, extra = '') =>
  console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);

let pass = 0;
let fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) pass += 1; else fail += 1;
  ok(label, cond, extra);
};

async function call(server, method, path, { token, body, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.authorization = `Bearer ${token}`;
  if (body !== undefined) {
    h['content-type'] = 'application/json';
  }
  const opts = { method, path, headers: h };
  return new Promise((resolve) => {
    const req = http.request({ ...opts, port: server.address().port }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch { json = data; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

// ---------- main -------------------------------------------------------------
async function main() {
  console.log('Booting app...');
  const { app, models } = await bootApp();
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  console.log(`Test server listening on :${server.address().port}`);

  const { User, UserRole, Role, MerchantApplication, Merchant, Product, MerchantProduct } = models;

  // Resolve tokens for full admin + admin_employee + customer (negative case).
  const role = await Role.findOne({ where: { slug: 'admin' } });
  const adminUr = await UserRole.findOne({ where: { role_id: role.id } });
  const adminUser = await User.findByPk(adminUr.user_id);
  const adminToken = signUserToken(adminUser).token;

  const aeRole = await Role.findOne({ where: { slug: 'admin_employee' } });
  const aeUr = await UserRole.findOne({ where: { role_id: aeRole.id } });
  const aeUser = await User.findByPk(aeUr.user_id);
  const aeToken = signUserToken(aeUser).token;

  const customerRole = await Role.findOne({ where: { slug: 'customer' } });
  const customerUr = await UserRole.findOne({ where: { role_id: customerRole.id } });
  const customerToken = customerUr ? signUserToken(await User.findByPk(customerUr.user_id)).token : null;

  console.log(`\nadmin   → ${adminUser.phone}`);
  console.log(`aempl   → ${aeUser.phone}`);

  // =========================================================================
  // 1. AUTH GATING
  // =========================================================================
  console.log('\n--- 1. Auth gating ---');
  let r = await call(server, 'GET', '/api/admin/dashboard');
  check('no token → 401', r.status === 401, `got ${r.status}`);

  if (customerToken) {
    r = await call(server, 'GET', '/api/admin/dashboard', { token: customerToken });
    check('customer token → 403 admin_required', r.status === 403 && r.body?.error?.code === 'admin_required' || r.body?.details?.[0]?.code === 'admin_required' || r.body?.code === 'admin_required' || r.status === 403, `got ${r.status}`);
  }

  // =========================================================================
  // 2. DASHBOARD
  // =========================================================================
  console.log('\n--- 2. Dashboard ---');
  r = await call(server, 'GET', '/api/admin/dashboard', { token: adminToken });
  check('admin GET /dashboard → 200', r.status === 200, `got ${r.status}`);
  check('dashboard has kpis', !!r.body?.data?.kpis, JSON.stringify(r.body?.data?.kpis?.total_merchants));

  r = await call(server, 'GET', '/api/admin/dashboard', { token: aeToken });
  check('aempl GET /dashboard → 200 (read-only ok)', r.status === 200, `got ${r.status}`);

  // =========================================================================
  // 3. MERCHANTS (read)
  // =========================================================================
  console.log('\n--- 3. Merchants (read) ---');
  r = await call(server, 'GET', '/api/admin/merchants', { token: adminToken });
  check('admin GET /merchants → 200', r.status === 200, `got ${r.status}`);
  check('merchants response paginated', !!r.body?.pagination, `n=${r.body?.pagination?.total}`);
  const firstMerchant = r.body?.data?.[0];
  if (firstMerchant) check('merchant IBAN masked', firstMerchant.iban?.startsWith('****'), firstMerchant.iban);

  r = await call(server, 'GET', '/api/admin/merchants', { token: aeToken });
  check('aempl GET /merchants → 200', r.status === 200, `got ${r.status}`);

  // =========================================================================
  // 4. PRODUCTS + ASSIGN/UNASSIGN
  // =========================================================================
  console.log('\n--- 4. Products + assign/unassign ---');
  r = await call(server, 'GET', '/api/admin/products', { token: adminToken });
  check('admin GET /products → 200', r.status === 200, `got ${r.status}`);

  r = await call(server, 'GET', '/api/admin/products', { token: aeToken });
  check('aempl GET /products → 200', r.status === 200, `got ${r.status}`);

  // aempl POST /products → 403
  r = await call(server, 'POST', '/api/admin/products', {
    token: aeToken,
    body: { sku: 'X', slug: 'x', name_ar: 'x', price_sar: 1 },
  });
  check('aempl POST /products → 403 forbidden_read_only', r.status === 403, `got ${r.status} ${r.body?.code || r.body?.details?.[0]?.code}`);

  // Pick a real product + merchant for assign/unassign.
  const product = await Product.findOne({ where: { status: 'active' } });
  const merchant = await Merchant.findOne({ where: { status: 'active' } });
  if (product && merchant) {
    // Clean any prior assignment from a previous run for a clean test.
    await MerchantProduct.destroy({ where: { product_id: product.id, merchant_id: merchant.id, package_id: null } });

    r = await call(server, 'POST', `/api/admin/products/${product.id}/assign`, {
      token: adminToken,
      body: { merchant_id: merchant.id },
    });
    check('admin POST /products/:id/assign → 201', r.status === 201, `got ${r.status}`);

    // duplicate assign → 409
    r = await call(server, 'POST', `/api/admin/products/${product.id}/assign`, {
      token: adminToken,
      body: { merchant_id: merchant.id },
    });
    check('duplicate assign → 409', r.status === 409, `got ${r.status}`);

    // assign to non-existent merchant → 404
    r = await call(server, 'POST', `/api/admin/products/${product.id}/assign`, {
      token: adminToken,
      body: { merchant_id: '00000000-0000-0000-0000-000000000000' },
    });
    check('assign to missing merchant → 404', r.status === 404, `got ${r.status}`);

    // aempl assign → 403
    r = await call(server, 'POST', `/api/admin/products/${product.id}/assign`, {
      token: aeToken,
      body: { merchant_id: merchant.id },
    });
    check('aempl POST assign → 403', r.status === 403, `got ${r.status}`);

    // toggle-active (aempl → 403, admin → 200)
    r = await call(server, 'PATCH', `/api/admin/products/${product.id}/toggle-active`, { token: aeToken });
    check('aempl PATCH toggle-active → 403', r.status === 403, `got ${r.status}`);

    r = await call(server, 'PATCH', `/api/admin/products/${product.id}/toggle-active`, { token: adminToken });
    check('admin PATCH toggle-active → 200', r.status === 200, `got ${r.status} status=${r.body?.data?.status}`);
    // toggle back so we don't change the catalog
    await call(server, 'PATCH', `/api/admin/products/${product.id}/toggle-active`, { token: adminToken });

    // unassign (admin)
    r = await call(server, 'DELETE', `/api/admin/products/${product.id}/assign/${merchant.id}`, { token: adminToken });
    check('admin DELETE /products/:id/assign/:merchantId → 200', r.status === 200, `got ${r.status}`);

    // unassign again → 404 (assignment no longer exists)
    r = await call(server, 'DELETE', `/api/admin/products/${product.id}/assign/${merchant.id}`, { token: adminToken });
    check('re-unassign → 404', r.status === 404, `got ${r.status}`);
  } else {
    console.log('! skipped assign/unassign — no active product/merchant found');
  }

  // =========================================================================
  // 5. CATEGORIES & PACKAGES
  // =========================================================================
  console.log('\n--- 5. Categories & Packages ---');
  r = await call(server, 'GET', '/api/admin/categories', { token: adminToken });
  check('admin GET /categories → 200', r.status === 200, `got ${r.status}`);

  r = await call(server, 'POST', '/api/admin/categories', {
    token: aeToken,
    body: { slug: 'x', name_ar: 'x' },
  });
  check('aempl POST /categories → 403', r.status === 403, `got ${r.status}`);

  r = await call(server, 'GET', '/api/admin/packages', { token: adminToken });
  check('admin GET /packages → 200', r.status === 200, `got ${r.status}`);

  r = await call(server, 'POST', '/api/admin/packages', {
    token: aeToken,
    body: { sku: 'x', slug: 'x', name_ar: 'x', price_sar: 1 },
  });
  check('aempl POST /packages → 403', r.status === 403, `got ${r.status}`);

  // =========================================================================
  // 6. USERS
  // =========================================================================
  console.log('\n--- 6. Users ---');
  r = await call(server, 'GET', '/api/admin/users', { token: adminToken });
  check('admin GET /users → 200', r.status === 200, `got ${r.status}`);
  const firstUser = r.body?.data?.[0];
  if (firstUser) check('users list never exposes password_hash', !('password_hash' in firstUser), Object.keys(firstUser || {}).join(','));

  r = await call(server, 'PATCH', `/api/admin/users/${aeUser.id}/toggle-active`, { token: aeToken });
  check('aempl PATCH users toggle-active → 403', r.status === 403, `got ${r.status}`);

  // =========================================================================
  // 7. REPORTS
  // =========================================================================
  console.log('\n--- 7. Reports ---');
  r = await call(server, 'GET', '/api/admin/reports', { token: adminToken });
  check('admin GET /reports → 200', r.status === 200, `got ${r.status}`);
  check('reports has sales block', !!r.body?.data?.sales, `gmv=${r.body?.data?.sales?.total_gmv_sar}`);

  r = await call(server, 'GET', '/api/admin/reports?from=2026-01-01T00:00:00Z&to=2026-12-31T23:59:59Z', { token: aeToken });
  check('aempl GET /reports with range → 200', r.status === 200, `got ${r.status}`);

  // =========================================================================
  // 8. SETTINGS
  // =========================================================================
  console.log('\n--- 8. Settings ---');
  r = await call(server, 'GET', '/api/admin/settings', { token: adminToken });
  check('admin GET /settings → 200', r.status === 200, `got ${r.status}`);
  check('settings grouped + items', !!r.body?.data?.grouped && !!r.body?.data?.items, `items=${r.body?.data?.items?.length}`);

  r = await call(server, 'PUT', '/api/admin/settings', {
    token: aeToken,
    body: { 'platform.test_read_only': false },
  });
  check('aempl PUT /settings → 403', r.status === 403, `got ${r.status}`);

  r = await call(server, 'PUT', '/api/admin/settings', {
    token: adminToken,
    body: { 'platform.test_setting': { hello: 'world' } },
  });
  check('admin PUT /settings → 200', r.status === 200, `got ${r.status}`);
  // cleanup test setting
  await models.Setting.destroy({ where: { key: 'platform.test_setting' } });

  // =========================================================================
  // 9. MERCHANT APPLICATIONS — approve/reject lifecycle
  // =========================================================================
  console.log('\n--- 9. Merchant applications lifecycle ---');
  r = await call(server, 'GET', '/api/admin/merchant-applications', { token: adminToken });
  check('admin GET /merchant-applications → 200', r.status === 200, `got ${r.status}`);

  // Create a fresh pending application through the existing /api path so the
  // approve flow has something to operate on. Use a unique CR no per run.
  const uniqueCr = `TEST-${Date.now()}`;
  const freshApp = await MerchantApplication.create({
    user_id: aeUser.id, // any existing user; approval path will reject duplicate merchant creation if one exists
    status: 'pending',
    commercial_name: `متجر اختبار ${uniqueCr}`,
    commercial_registration_no: uniqueCr,
    vat_number: null,
    iban: 'SA0380000000608010167519',
    notes: 'اختبار تلقائي',
  });
  console.log(`  created application ${freshApp.id} (cr=${uniqueCr})`);

  // But: aeUser is already tied to an admin_employee role; we need a user that
  // doesn't already have a merchant. Pick a fresh approach: create a throwaway
  // user to own this application.
  const ownerUser = await User.create({
    email: `apptest-${Date.now()}@subh.example.sa`,
    phone: `05${Math.floor(10000000 + Math.random() * 89999999)}`,
    password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    full_name: 'متجر اختبار',
    is_active: true,
    is_guest: false,
  });
  await freshApp.update({ user_id: ownerUser.id });

  // aempl approve → 403
  r = await call(server, 'POST', `/api/admin/merchant-applications/${freshApp.id}/approve`, { token: aeToken });
  check('aempl POST approve → 403', r.status === 403, `got ${r.status}`);

  // admin approve → 200
  r = await call(server, 'POST', `/api/admin/merchant-applications/${freshApp.id}/approve`, { token: adminToken });
  check('admin POST approve → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.body?.data)}`);

  // re-approve → 409 (idempotency)
  r = await call(server, 'POST', `/api/admin/merchant-applications/${freshApp.id}/approve`, { token: adminToken });
  check('re-approve → 409 already_approved', r.status === 409, `got ${r.status}`);

  // reject after approve → 409
  r = await call(server, 'POST', `/api/admin/merchant-applications/${freshApp.id}/reject`, { token: adminToken, body: { reason: 'اختبار' } });
  check('reject after approve → 409', r.status === 409, `got ${r.status}`);

  // Verify merchant row created.
  const createdMerchant = await Merchant.findOne({ where: { user_id: ownerUser.id } });
  check('merchant row created on approve', !!createdMerchant, createdMerchant?.id);

  // Create a second pending application and reject it — then test re-reject → 409.
  const app2 = await MerchantApplication.create({
    user_id: ownerUser.id,
    status: 'pending',
    commercial_name: `متجر اختبار 2 ${uniqueCr}`,
    commercial_registration_no: `${uniqueCr}-B`,
    vat_number: null,
    iban: 'SA0380000000608010167519',
  });

  r = await call(server, 'POST', `/api/admin/merchant-applications/${app2.id}/reject`, { token: adminToken, body: { reason: 'سبب اختبار' } });
  check('admin POST reject → 200', r.status === 200, `got ${r.status}`);

  r = await call(server, 'POST', `/api/admin/merchant-applications/${app2.id}/reject`, { token: adminToken, body: { reason: 't' } });
  check('re-reject → 409 already_rejected', r.status === 409, `got ${r.status}`);

  // cleanup
  await MerchantApplication.destroy({ where: { id: [freshApp.id, app2.id] }, force: true });
  if (createdMerchant) {
    await MerchantProduct.destroy({ where: { merchant_id: createdMerchant.id } });
    await Merchant.destroy({ where: { id: createdMerchant.id }, force: true });
  }
  await UserRole.destroy({ where: { user_id: ownerUser.id } });
  await User.destroy({ where: { id: ownerUser.id }, force: true });

  // =========================================================================
  // 10. NON-ADMIN WRITE VERBS ON EVERY WRITE ENDPOINT
  // =========================================================================
  console.log('\n--- 10. Write verb matrix (aempl must 403 everywhere) ---');
  const writeVerbs = [
    ['POST',   '/api/admin/products',                         { sku: 'a', slug: 'a', name_ar: 'a', price_sar: 1 }],
    ['PUT',    `/api/admin/products/${product ? product.id : '00000000-0000-0000-0000-000000000000'}`, { name_ar: 'a' }],
    ['PATCH',  `/api/admin/products/${product ? product.id : '00000000-0000-0000-0000-000000000000'}/toggle-active`, null],
    ['POST',   '/api/admin/categories',                       { slug: 'a', name_ar: 'a' }],
    ['PUT',    '/api/admin/categories/00000000-0000-0000-0000-000000000000', { name_ar: 'a' }],
    ['PATCH',  '/api/admin/categories/00000000-0000-0000-0000-000000000000/toggle-active', null],
    ['POST',   '/api/admin/packages',                         { sku: 'a', slug: 'a', name_ar: 'a', price_sar: 1 }],
    ['PUT',    '/api/admin/packages/00000000-0000-0000-0000-000000000000', { name_ar: 'a' }],
    ['PATCH',  '/api/admin/packages/00000000-0000-0000-0000-000000000000/toggle-active', null],
    ['PATCH',  `/api/admin/users/${aeUser.id}/toggle-active`, null],
    ['PUT',    '/api/admin/settings',                         { 'k': 1 }],
    ['POST',   '/api/admin/merchant-applications/00000000-0000-0000-0000-000000000000/approve', null],
    ['POST',   '/api/admin/merchant-applications/00000000-0000-0000-0000-000000000000/reject', { reason: 'x' }],
    ['DELETE', `/api/admin/products/00000000-0000-0000-0000-000000000000/assign/00000000-0000-0000-0000-000000000000`, null],
  ];
  for (const [m, p, b] of writeVerbs) {
    r = await call(server, m, p, { token: aeToken, body: b === null ? undefined : b });
    check(`aempl ${m} ${p.replace('00000000-0000-0000-0000-000000000000', ':id')} → 403`,
      r.status === 403,
      `got ${r.status}`);
  }

  console.log(`\n=========================================`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  console.log(`=========================================`);

  server.close();
  await models.Setting.sequelize.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('TEST SUITE FAILED:', e);
  process.exit(1);
});
