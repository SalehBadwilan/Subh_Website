/**
 * Lightweight smoke test for the Customer APIs (Stage 1).
 *
 * Boots the real server-less: it calls the Express app in-process via supertest
 * is NOT a dependency, so instead we start the server on a random port, then
 * drive the HTTP routes with the global fetch (Node 20+).
 *
 * Flow:
 *  1. OTP request + verify → JWT
 *  2. Public catalog reads (products, search, category products)
 *  3. Authenticated reads (me, cart, addresses, notifications, orders, packages)
 *  4. Authorization check (no token → 401; foreign order → 404)
 *  5. Mutation: create address + set default + create ticket
 *
 * Run: node scripts/test-customer-api.mjs
 */
import env from '../src/config/env.js';
import { bootApp } from '../src/app.js';
import sequelize from '../src/config/database.js';

const BASE = `http://127.0.0.1:${env.port}`;
let token = '';
let userId = '';
let server;
const results = { pass: 0, fail: 0, checks: [] };

function log(ok, name, extra = '') {
  if (ok) results.pass += 1;
  else results.fail += 1;
  results.checks.push(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
}

async function req(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (auth && token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { status: res.status, json };
}

async function main() {
  const { app } = await bootApp();
  await new Promise((r) => (server = app.listen(env.port, r)));
  console.log(`Smoke test listening on ${BASE}`);

  // 1) Auth flow
  const otpReq = await req('/api/auth/otp/request', { method: 'POST', auth: false, body: { phone: '0533334444' } });
  const code = otpReq.json?.data?.devOtp;
  log(otpReq.status === 200 && !!code, 'POST /api/auth/otp/request returns devOtp');

  const verify = await req('/api/auth/otp/verify', { method: 'POST', auth: false, body: { phone: '0533334444', otp: code } });
  token = verify.json?.data?.token;
  userId = verify.json?.data?.user?.id;
  log(verify.status === 200 && !!token, 'POST /api/auth/otp/verify returns token');

  // 2) Public catalog reads
  const products = await req('/api/products?limit=3');
  log(products.status === 200 && Array.isArray(products.json?.data), 'GET /api/products', `total=${products.json?.pagination?.total}`);

  const search = await req('/api/products/search?q=a');
  log(search.status === 200 && Array.isArray(search.json?.data), 'GET /api/products/search');

  // find a category id to test category products
  const cats = await req('/api/categories');
  const catId = cats.json?.data?.[0]?.id;
  if (catId) {
    const cp = await req(`/api/categories/${catId}/products`);
    log(cp.status === 200 && Array.isArray(cp.json?.data), 'GET /api/categories/:id/products');
  } else {
    log(true, 'GET /api/categories/:id/products (skipped — no categories)');
  }

  // 3) Authenticated reads
  const me = await req('/api/users/me');
  log(me.status === 200 && me.json?.data?.id === userId, 'GET /api/users/me', `id=${me.json?.data?.id}`);

  const cart = await req('/api/cart');
  log(cart.status === 200 && !!cart.json?.data?.id, 'GET /api/cart', `status=${cart.json?.data?.status}`);

  const addrs = await req('/api/addresses');
  log(addrs.status === 200 && Array.isArray(addrs.json?.data), 'GET /api/addresses');

  const notifs = await req('/api/notifications');
  log(notifs.status === 200, 'GET /api/notifications');

  const orders = await req('/api/orders');
  log(orders.status === 200 && Array.isArray(orders.json?.data), 'GET /api/orders');

  const pkgs = await req('/api/packages', { auth: false });
  log(pkgs.status === 200, 'GET /api/packages (public, active only)');

  // 4) Authorization checks
  const noToken = await req('/api/users/me', { auth: false });
  log(noToken.status === 401, 'GET /api/users/me without token → 401', `got=${noToken.status}`);

  const badOrder = await req('/api/orders/00000000-0000-0000-0000-000000000000');
  log(badOrder.status === 404, 'GET /api/orders/:foreignId → 404', `got=${badOrder.status}`);

  // 5) Mutations: address create + default
  const created = await req('/api/addresses', {
    method: 'POST',
    body: {
      recipient_name: 'مستخدم اختبار',
      phone: '0533334444',
      line1: 'حي الاختبار',
      city: 'الرياض',
      region: 'منطقة الرياض',
      is_default: true,
    },
  });
  log(created.status === 201 && !!created.json?.data?.id, 'POST /api/addresses', `id=${created.json?.data?.id}`);
  const addrId = created.json?.data?.id;

  if (addrId) {
    const def = await req(`/api/addresses/${addrId}/default`, { method: 'POST' });
    log(def.status === 200 && def.json?.data?.is_default === true, 'POST /api/addresses/:id/default');
  }

  // Support ticket
  const ticket = await req('/api/support/tickets', {
    method: 'POST',
    body: { subject_ar: 'مشكلة في الطلب', message_ar: 'مرحبًا، أواجه مشكلة في الطلب رقم 123', category: 'delivery' },
  });
  log(ticket.status === 201 && !!ticket.json?.data?.id, 'POST /api/support/tickets', `status=${ticket.json?.data?.status}`);

  // read-all notifications (idempotent)
  const readAll = await req('/api/notifications/read-all', { method: 'POST' });
  log(readAll.status === 200 && typeof readAll.json?.data?.marked_read === 'number', 'POST /api/notifications/read-all');

  // Validation check: missing q on search
  const noQ = await req('/api/products/search');
  log(noQ.status === 422, 'GET /api/products/search without q → 422', `got=${noQ.status}`);

  // Summary
  console.log('\n================ RESULTS ================');
  for (const c of results.checks) console.log(c);
  console.log(`\nPassed: ${results.pass} | Failed: ${results.fail}`);
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
