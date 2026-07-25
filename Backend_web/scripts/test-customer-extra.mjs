/**
 * Additional Customer APIs coverage:
 *  - GET /api/products/:id (detail)
 *  - PUT /api/cart (replace items)
 *  - PUT /api/addresses/:id (update)
 *  - DELETE /api/addresses/:id
 *  - PUT /api/users/me (update profile)
 *  - POST /api/merchant-applications (authenticated submit)
 */
import env from '../src/config/env.js';
import { bootApp } from '../src/app.js';
import sequelize from '../src/config/database.js';

const BASE = `http://127.0.0.1:${env.port}`;
let token = '';
const checks = [];

async function req(path, opts = {}) {
  const o = { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } };
  if (token) o.headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) o.body = JSON.stringify(opts.body);
  const res = await fetch(`${BASE}${path}`, o);
  let json = null;
  try { json = await res.json(); } catch { /* */ }
  return { status: res.status, json };
}

async function main() {
  const { app, models } = await bootApp();
  const server = await new Promise((r) => { const s = app.listen(env.port, () => r(s)); });

  try {
    // seed an active product for detail + cart tests
    const prod = await models.Product.create({
      sku: `EXTRA${Date.now()}`, slug: `extra${Date.now()}`, name_ar: 'منتج إضافي',
      price_sar: 50, vat_rate: 0.15, status: 'active', weight_grams: 100, is_package: false,
    });

    // auth
    let r = await req('/api/auth/otp/request', { method: 'POST', body: { phone: '0599990001' } });
    const code = r.json.data.devOtp;
    r = await req('/api/auth/otp/verify', { method: 'POST', body: { phone: '0599990001', otp: code } });
    token = r.json.data.token;

    // GET /api/products/:id
    r = await req(`/api/products/${prod.id}`);
    checks.push(['GET /api/products/:id', r.status === 200 && r.json.data.id === prod.id, `status=${r.status}`]);

    // PUT /api/users/me
    r = await req('/api/users/me', { method: 'PUT', body: { full_name: 'اسم محدّث' } });
    checks.push(['PUT /api/users/me', r.status === 200 && r.json.data.full_name === 'اسم محدّث', `status=${r.status} name=${r.json.data.full_name}`]);

    // PUT /api/cart (empty)
    r = await req('/api/cart', { method: 'PUT', body: { items: [] } });
    checks.push(['PUT /api/cart (empty)', r.status === 200 && r.json.data.items_count === 0, `status=${r.status}`]);

    // POST /api/merchant-applications (authenticated)
    r = await req('/api/merchant-applications', {
      method: 'POST',
      body: {
        commercial_name: 'متجر جديد',
        commercial_registration_no: 'CR' + Date.now(),
        iban: 'SA' + Date.now().toString().slice(-20).padStart(20, '0'),
      },
    });
    checks.push(['POST /api/merchant-applications', r.status === 201 && !!r.json.data.id, `status=${r.status} status_field=${r.json.data.status}`]);

    // address update + delete cycle
    r = await req('/api/addresses', { method: 'POST', body: { recipient_name: 'عميل', phone: '0599990001', line1: 'شارع', city: 'جدة', region: 'مكة' } });
    const addrId = r.json.data.id;
    r = await req(`/api/addresses/${addrId}`, { method: 'PUT', body: { city: 'الدمام' } });
    checks.push(['PUT /api/addresses/:id', r.status === 200 && r.json.data.city === 'الدمام', `status=${r.status} city=${r.json.data.city}`]);
    r = await req(`/api/addresses/${addrId}`, { method: 'DELETE' });
    checks.push(['DELETE /api/addresses/:id', r.status === 200, `status=${r.status}`]);
    r = await req(`/api/addresses/${addrId}`);
    checks.push(['GET deleted address → 404', r.status === 404, `status=${r.status}`]);

    // authZ: PUT /api/users/me without token
    token = '';
    r = await req('/api/users/me', { method: 'PUT', body: { full_name: 'x' } });
    checks.push(['PUT /api/users/me no token → 401', r.status === 401, `status=${r.status}`]);

    console.log('=== CUSTOMER EXTRA COVERAGE ===');
    let pass = 0, fail = 0;
    for (const [name, ok, extra] of checks) {
      console.log(`  ${ok ? '✅' : '❌'} ${name} — ${extra}`);
      if (ok) pass++; else fail++;
    }
    console.log(`\nPassed: ${pass} | Failed: ${fail}`);
    if (fail > 0) process.exitCode = 1;
  } catch (e) {
    console.error('Extra test crashed:', e.message);
    if (e.details) console.error('  details:', JSON.stringify(e.details));
    process.exitCode = 1;
  } finally {
    server.close();
    await sequelize.close().catch(() => {});
  }
}

main();
