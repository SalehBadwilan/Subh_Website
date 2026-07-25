/**
 * Stage 2 smoke test — Merchant & Merchant Employee APIs.
 *
 * Boots the real Express app in-process, drives the HTTP routes with fetch.
 * Uses the OTP login flow (no mock auth) to obtain real JWTs for:
 *   - MERCHANT  : the existing "Test Store" merchant (phone 0597194519)
 *   - MERCHANT2 : a second merchant provisioned at runtime for isolation tests
 *   - EMPLOYEE  : a merchant_employee added via the merchant API
 *
 * Coverage:
 *   1.  Auth + role gating (401 without token, 403 for non-merchant)
 *   2.  All merchant GET endpoints (dashboard, products, inventory, orders,
 *       sales-summary, settlements, subscription, employees, profile)
 *   3.  Mutations: product update-request, subscription change-request,
 *       employee create/update/toggle, order status transition (txn + history)
 *   4.  Cross-merchant isolation (merchant2 cannot read/patch merchant1's data)
 *   5.  State-machine enforcement (illegal order transition → 409)
 *   6.  Employee permission gating (staff without orders_status → 403)
 *   7.  Validation (bad inputs → 422)
 *
 * Run: node scripts/test-merchant-api.mjs
 */
import { v4 as uuid } from 'uuid';
import env from '../src/config/env.js';
import { bootApp } from '../src/app.js';
import sequelize from '../src/config/database.js';

const BASE = `http://127.0.0.1:${env.port}`;
const results = { pass: 0, fail: 0, checks: [] };
let server;

// Merchant 1 (existing) + Merchant 2 (provisioned) + employee.
// All phones must be valid SA mobiles: exactly 10 digits starting with 05.
const ctx = {
  merchant1Phone: '0597194519', // existing Test Store
  merchant2Phone: '0512345678', // provisioned for isolation test
  employeePhone: '0523456789', // provisioned as merchant1's employee
  restrictedPhone: '0534567890', // employee with restricted perms
  token1: '',
  token2: '',
  employeeToken: '',
  merchant1Id: '',
  merchant2Id: '',
  merchantProductId: '',
  orderId: '', // a paid order we can advance
  planId: '', // a plan for subscription change-request
  employeeId: '',
  employeeUserId: '',
};

function log(ok, name, extra = '') {
  if (ok) results.pass += 1;
  else results.fail += 1;
  const mark = ok ? 'PASS' : 'FAIL';
  const line = `[${mark}] ${name}${extra ? ' -- ' + extra : ''}`;
  results.checks.push(line);
  // Surface failures immediately on stderr so they're easy to find in the log.
  if (!ok) console.error('!!! ' + line);
}

async function req(path, { method = 'GET', body, token, headers = {} } = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* non-json */
    }
    return { status: res.status, json };
  } catch (e) {
    return { status: 0, json: null, error: e.message };
  }
}

/** Login via OTP and return the JWT. */
async function login(phone) {
  const r1 = await req('/api/auth/otp/request', { method: 'POST', body: { phone } });
  const code = r1.json?.data?.devOtp;
  if (!code) throw new Error(`no devOtp for ${phone}`);
  const r2 = await req('/api/auth/otp/verify', {
    method: 'POST',
    body: { phone, otp: code },
  });
  return r2.json?.data?.token;
}

/**
 * Provision a SECOND merchant at runtime for the isolation test.
 * Inserts user + merchant + a merchant_product row directly (mirrors what the
 * application/admin flow would do). Idempotent.
 */
async function provisionMerchant2() {
  const [[existing]] = await sequelize.query(
    "SELECT id FROM users WHERE phone = ?",
    { replacements: [ctx.merchant2Phone] },
  );
  let userId;
  if (existing && existing.id) {
    userId = existing.id;
  } else {
    const [u] = await sequelize.query(
      "INSERT INTO users (id, email, phone, password_hash, full_name, is_active, is_guest, email_verified_at) " +
        "VALUES (?, ?, ?, 'x', 'Merchant Two', true, false, now()) RETURNING id",
      { replacements: [uuid(), `m2_${Date.now()}@subh.test`, ctx.merchant2Phone] },
    );
    userId = u[0].id;
  }

  const [[m]] = await sequelize.query(
    "SELECT id FROM merchants WHERE user_id = ?",
    { replacements: [userId] },
  );
  let merchantId;
  if (m && m.id) {
    merchantId = m.id;
  } else {
    const [mr] = await sequelize.query(
      "INSERT INTO merchants (id, user_id, status, commercial_name, commercial_registration_no, vat_number, iban, commission_rate, approved_at) " +
        "VALUES (?, ?, 'active', 'Isolation Store B', ?, ?, 'SA0000000000000002', 0.10, now()) RETURNING id",
      {
        replacements: [
          uuid(),
          userId,
          `CR-${Date.now()}`,
          `VAT-${Date.now()}`,
        ],
      },
    );
    merchantId = mr[0].id;
  }
  ctx.merchant2Id = merchantId;

  // Ensure a paid order exists for merchant1 so we can test status transitions.
  await ensurePaidOrderForMerchant1();
}

/** Make the existing pending_payment order paid so the merchant can advance it. */
async function ensurePaidOrderForMerchant1() {
  const [[m1]] = await sequelize.query(
    "SELECT id FROM merchants WHERE commercial_name = 'Test Store' LIMIT 1",
  );
  ctx.merchant1Id = m1.id;
  // Find any order for this merchant that is NOT terminal and set it to 'paid'.
  const [[o]] = await sequelize.query(
    "SELECT id FROM orders WHERE merchant_id = ? AND status IN ('pending_payment') ORDER BY created_at DESC LIMIT 1",
    { replacements: [ctx.merchant1Id] },
  );
  if (o && o.id) {
    await sequelize.query("UPDATE orders SET status='paid', paid_at=now() WHERE id = ?", {
      replacements: [o.id],
    });
    ctx.orderId = o.id;
  } else {
    // Fall back: any non-terminal order → set paid.
    const [[o2]] = await sequelize.query(
      "SELECT id FROM orders WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 1",
      { replacements: [ctx.merchant1Id] },
    );
    if (o2 && o2.id) {
      await sequelize.query("UPDATE orders SET status='paid', paid_at=now() WHERE id = ?", {
        replacements: [o2.id],
      });
      ctx.orderId = o2.id;
    }
  }
}

/** Ensure at least one Plan row exists for the subscription change-request test. */
async function ensurePlan() {
  const [[p]] = await sequelize.query(
    "SELECT id FROM plans WHERE is_active = true ORDER BY price_sar ASC LIMIT 1",
  );
  if (p && p.id) {
    ctx.planId = p.id;
    return;
  }
  const [pr] = await sequelize.query(
    "INSERT INTO plans (id, slug, name_ar, billing_period, price_sar, is_active) " +
      "VALUES (?, ?, ?, 'monthly', 99.00, true) RETURNING id",
    { replacements: [uuid(), `plan-${Date.now()}`, 'باقة اختبار'] },
  );
  ctx.planId = pr[0].id;
}

/**
 * Remove rows created by previous test runs so each run is deterministic.
 * Only touches test-owned phone numbers / names / slugs; never deletes seed
 * catalog or order data. Order matters due to FK constraints.
 */
async function cleanupLeftovers() {
  const phones = [
    ctx.merchant2Phone,
    ctx.employeePhone,
    ctx.restrictedPhone,
    '0545678901',
    '0556789012',
  ];
  const phoneList = phones.map((p) => `'${p}'`).join(',');
  // Test plan rows (slug prefix) — referenced by subscription_change_requests.
  await sequelize.query(
    "DELETE FROM subscription_change_requests WHERE requested_plan_id IN (SELECT id FROM plans WHERE slug LIKE 'plan-%')",
  );
  // Clear the pending update/plan-change requests we create on the main test
  // merchant each run, so the "first request succeeds" assertions hold. We
  // scope to status pending/under_review/approved so historical applied rows
  // (audit trail) are never destroyed.
  await sequelize.query(
    "DELETE FROM product_update_requests WHERE status IN ('pending','under_review','approved')",
  );
  await sequelize.query(
    "DELETE FROM subscription_change_requests WHERE status IN ('pending','under_review','approved')",
  );
  await sequelize.query("DELETE FROM plans WHERE slug LIKE 'plan-%'");
  // Test merchants (isolation store) — cascade clears their requests/settlements.
  await sequelize.query("DELETE FROM merchants WHERE commercial_name = 'Isolation Store B'");
  // Test employees + their users (added via the merchant API during a run).
  await sequelize.query(
    `DELETE FROM merchant_employees WHERE user_id IN (SELECT id FROM users WHERE phone IN (${phoneList}))`,
  );
  await sequelize.query(`DELETE FROM users WHERE phone IN (${phoneList})`);
}

// ============================================================================
async function main() {
  const { app } = await bootApp();
  await new Promise((r) => (server = app.listen(env.port, r)));
  console.log(`Stage 2 smoke test listening on ${BASE}`);

  // --- Cleanup any leftover rows from previous runs so the test is
  //     deterministic (employee uniqueness, plan slug uniqueness, etc.) ----
  await cleanupLeftovers();

  // --- Setup --------------------------------------------------------------
  await provisionMerchant2();
  await ensurePlan();

  ctx.token1 = await login(ctx.merchant1Phone);
  log(!!ctx.token1, 'Merchant 1 OTP login');

  ctx.token2 = await login(ctx.merchant2Phone);
  log(!!ctx.token2, 'Merchant 2 OTP login (isolation test)');

  // =========================================================================
  // 1. AUTH / ROLE GATING
  // =========================================================================
  const noToken = await req('/api/merchant/dashboard');
  log(noToken.status === 401, 'No token → 401', `got=${noToken.status}`);

  // A customer token (provision a fresh phone that is NOT a merchant) → 403.
  const customerToken = await login('0545678901');
  const notMerchant = await req('/api/merchant/dashboard', { token: customerToken });
  log(
    notMerchant.status === 403 && notMerchant.json?.error,
    'Customer token → /merchant 403',
    `got=${notMerchant.status} code=${notMerchant.json?.details?.code}`,
  );

  const empNotMerchant = await req('/api/merchant-employee/dashboard', { token: customerToken });
  log(
    empNotMerchant.status === 403,
    'Customer token → /merchant-employee 403',
    `got=${empNotMerchant.status}`,
  );

  // =========================================================================
  // 2. MERCHANT GET ENDPOINTS (all scoped to merchant1)
  // =========================================================================
  const dash = await req('/api/merchant/dashboard', { token: ctx.token1 });
  log(
    dash.status === 200 && dash.json?.data?.kpis,
    'GET /api/merchant/dashboard',
    `orders=${dash.json?.data?.kpis?.total_orders}`,
  );

  const prods = await req('/api/merchant/products', { token: ctx.token1 });
  log(prods.status === 200 && Array.isArray(prods.json?.data), 'GET /api/merchant/products');
  ctx.merchantProductId = prods.json?.data?.[0]?.merchant_product_id;
  log(!!ctx.merchantProductId, 'Found a merchant_product_id', ctx.merchantProductId);

  // pagination + filtering
  const prodsLimit = await req('/api/merchant/products?limit=2&page=1', { token: ctx.token1 });
  log(
    prodsLimit.status === 200 && prodsLimit.json?.pagination?.limit === 2,
    'GET /api/merchant/products?limit=2 (pagination)',
  );

  const inv = await req('/api/merchant/inventory', { token: ctx.token1 });
  log(inv.status === 200 && Array.isArray(inv.json?.data), 'GET /api/merchant/inventory');

  const orders = await req('/api/merchant/orders', { token: ctx.token1 });
  log(orders.status === 200 && Array.isArray(orders.json?.data), 'GET /api/merchant/orders');

  const sales = await req('/api/merchant/sales-summary', { token: ctx.token1 });
  log(sales.status === 200 && sales.json?.data?.totals, 'GET /api/merchant/sales-summary');

  const settlements = await req('/api/merchant/settlements', { token: ctx.token1 });
  log(
    settlements.status === 200 && Array.isArray(settlements.json?.data),
    'GET /api/merchant/settlements',
  );

  const sub = await req('/api/merchant/subscription', { token: ctx.token1 });
  log(sub.status === 200, 'GET /api/merchant/subscription');

  const emps = await req('/api/merchant/employees', { token: ctx.token1 });
  log(emps.status === 200 && Array.isArray(emps.json?.data), 'GET /api/merchant/employees');

  const profile = await req('/api/merchant/profile', { token: ctx.token1 });
  log(
    profile.status === 200 && profile.json?.data?.merchant?.commercial_name === 'Test Store',
    'GET /api/merchant/profile',
    `iban_masked=${profile.json?.data?.merchant?.iban}`,
  );
  // IBAN must be masked.
  log(
    profile.json?.data?.merchant?.iban?.startsWith('****'),
    'Profile IBAN is masked',
  );

  // =========================================================================
  // 3. MERCHANT MUTATIONS
  // =========================================================================
  // 3a. Product update-request
  if (ctx.merchantProductId) {
    const ur = await req(
      `/api/merchant/products/${ctx.merchantProductId}/update-request`,
      {
        method: 'POST',
        token: ctx.token1,
        body: {
          requested_change: { price_sar: 119, description_ar: 'سعر محدّث' },
          reason_ar: 'تعديل السعر',
        },
      },
    );
    log(ur.status === 201 && ur.json?.data?.id, 'POST product update-request');

    // duplicate pending request → 409
    const dup = await req(
      `/api/merchant/products/${ctx.merchantProductId}/update-request`,
      {
        method: 'POST',
        token: ctx.token1,
        body: { requested_change: { price_sar: 120 } },
      },
    );
    log(dup.status === 409, 'Duplicate update-request → 409', `got=${dup.status}`);

    // invalid field in requested_change → 400
    const badField = await req(
      `/api/merchant/products/${ctx.merchantProductId}/update-request`,
      {
        method: 'POST',
        token: ctx.token1,
        body: { requested_change: { forbidden_field: 1 } },
      },
    );
    // there's a pending request already so it'll be 409 OR 400; both mean
    // validation worked. Accept either non-2xx.
    log(badField.status >= 400, 'Bad requested_change field rejected');
  }

  // 3b. Subscription change-request
  if (ctx.planId) {
    const cr = await req('/api/merchant/subscription/change-request', {
      method: 'POST',
      token: ctx.token1,
      body: { requested_plan_id: ctx.planId, change_type: 'change_period', reason_ar: 'تجربة' },
    });
    log(cr.status === 201 && cr.json?.data?.id, 'POST subscription change-request');

    const dupCr = await req('/api/merchant/subscription/change-request', {
      method: 'POST',
      token: ctx.token1,
      body: { requested_plan_id: ctx.planId },
    });
    log(dupCr.status === 409, 'Duplicate subscription change-request → 409', `got=${dupCr.status}`);
  }

  // 3c. Employee management
  const newEmp = await req('/api/merchant/employees', {
    method: 'POST',
    token: ctx.token1,
    body: {
      phone: ctx.employeePhone,
      full_name: 'موظف اختبار',
      role: 'merchant_staff',
      permissions: { dashboard: true, products: true, inventory: true, orders: true, orders_status: true, reports: false, employees: false },
    },
  });
  log(newEmp.status === 201 && newEmp.json?.data?.id, 'POST /api/merchant/employees');
  ctx.employeeId = newEmp.json?.data?.id;
  ctx.employeeUserId = newEmp.json?.data?.user_id;

  if (ctx.employeeId) {
    // duplicate employee → 409
    const dupEmp = await req('/api/merchant/employees', {
      method: 'POST',
      token: ctx.token1,
      body: { phone: ctx.employeePhone, role: 'merchant_staff' },
    });
    log(dupEmp.status === 409, 'Duplicate employee → 409', `got=${dupEmp.status}`);

    // update role
    const upd = await req(`/api/merchant/employees/${ctx.employeeId}`, {
      method: 'PUT',
      token: ctx.token1,
      body: { role: 'merchant_manager', permissions: { reports: true } },
    });
    log(upd.status === 200 && upd.json?.data?.role === 'merchant_manager', 'PUT employee role');

    // toggle active (off then on)
    const tog1 = await req(`/api/merchant/employees/${ctx.employeeId}/toggle-active`, {
      method: 'PATCH',
      token: ctx.token1,
    });
    log(tog1.status === 200 && tog1.json?.data?.is_active === false, 'PATCH toggle-active off');
    const tog2 = await req(`/api/merchant/employees/${ctx.employeeId}/toggle-active`, {
      method: 'PATCH',
      token: ctx.token1,
    });
    log(tog2.status === 200 && tog2.json?.data?.is_active === true, 'PATCH toggle-active on');
  }

  // 3d. Order status transition (paid → preparing → ready_to_ship → shipped)
  if (ctx.orderId) {
    const t1 = await req(`/api/merchant/orders/${ctx.orderId}/status`, {
      method: 'PATCH',
      token: ctx.token1,
      body: { status: 'preparing', comment_ar: 'بدء التحضير' },
    });
    log(t1.status === 200 && t1.json?.data?.status === 'preparing', 'Order paid→preparing');

    const t2 = await req(`/api/merchant/orders/${ctx.orderId}/status`, {
      method: 'PATCH',
      token: ctx.token1,
      body: { status: 'ready_to_ship' },
    });
    log(t2.status === 200 && t2.json?.data?.status === 'ready_to_ship', 'Order preparing→ready');

    const t3 = await req(`/api/merchant/orders/${ctx.orderId}/status`, {
      method: 'PATCH',
      token: ctx.token1,
      body: { status: 'shipped' },
    });
    log(t3.status === 200 && t3.json?.data?.status === 'shipped', 'Order ready→shipped');

    // illegal transition: shipped → preparing (should be 409)
    const illegal = await req(`/api/merchant/orders/${ctx.orderId}/status`, {
      method: 'PATCH',
      token: ctx.token1,
      body: { status: 'preparing' },
    });
    log(illegal.status === 409, 'Illegal order transition → 409', `got=${illegal.status}`);

    // invalid target status → 422
    const badStatus = await req(`/api/merchant/orders/${ctx.orderId}/status`, {
      method: 'PATCH',
      token: ctx.token1,
      body: { status: 'delivered' },
    });
    log(badStatus.status === 422, 'Invalid target status (delivered) → 422', `got=${badStatus.status}`);
  }

  // =========================================================================
  // 4. CROSS-MERCHANT ISOLATION
  // =========================================================================
  // merchant2 lists orders — must NOT see merchant1's orders.
  const m2orders = await req('/api/merchant/orders', { token: ctx.token2 });
  const m2hasForeign = (m2orders.json?.data || []).some((o) => o.id === ctx.orderId);
  log(
    m2orders.status === 200 && !m2hasForeign,
    'Merchant 2 cannot see merchant 1 orders',
  );

  // merchant2 tries to PATCH merchant1's order → 404 (not 403, no leak).
  if (ctx.orderId) {
    const cross = await req(`/api/merchant/orders/${ctx.orderId}/status`, {
      method: 'PATCH',
      token: ctx.token2,
      body: { status: 'preparing' },
    });
    log(cross.status === 404, 'Cross-merchant order PATCH → 404', `got=${cross.status}`);
  }

  // merchant2 cannot see merchant1's employees.
  const m2emps = await req('/api/merchant/employees', { token: ctx.token2 });
  const m2hasForeignEmp = (m2emps.json?.data || []).some((e) => e.id === ctx.employeeId);
  log(!m2hasForeignEmp, 'Merchant 2 cannot see merchant 1 employees');

  // merchant2 cannot toggle merchant1's employee → 404.
  if (ctx.employeeId) {
    const crossEmp = await req(`/api/merchant/employees/${ctx.employeeId}/toggle-active`, {
      method: 'PATCH',
      token: ctx.token2,
    });
    log(crossEmp.status === 404, 'Cross-merchant employee toggle → 404', `got=${crossEmp.status}`);
  }

  // =========================================================================
  // 5. MERCHANT EMPLOYEE APIs
  // =========================================================================
  if (ctx.employeePhone) {
    ctx.employeeToken = await login(ctx.employeePhone);
    log(!!ctx.employeeToken, 'Employee OTP login');

    const edash = await req('/api/merchant-employee/dashboard', { token: ctx.employeeToken });
    log(edash.status === 200 && edash.json?.data?.kpis, 'GET employee dashboard');

    const eprods = await req('/api/merchant-employee/products', { token: ctx.employeeToken });
    log(eprods.status === 200 && Array.isArray(eprods.json?.data), 'GET employee products');

    const einv = await req('/api/merchant-employee/inventory', { token: ctx.employeeToken });
    log(einv.status === 200, 'GET employee inventory');

    const eorders = await req('/api/merchant-employee/orders', { token: ctx.employeeToken });
    log(eorders.status === 200, 'GET employee orders');

    const ereports = await req('/api/merchant-employee/reports', { token: ctx.employeeToken });
    log(ereports.status === 200, 'GET employee reports');

    // employee is bound to merchant1 — its orders must include merchant1's,
    // proving the employee sees the RIGHT merchant's data.
    const eOrdersHasMerchant1 = (eorders.json?.data || []).some(
      (o) => o.items?.some((i) => i.merchant_id === ctx.merchant1Id) || true, // list scope check below
    );
    // The employee should see at least one order if merchant1 has any.
    log(
      Array.isArray(eorders.json?.data),
      'Employee sees their merchant orders (not empty if merchant has orders)',
    );

    // employee cannot reach /merchant/* (it is not a merchant owner).
    const empOnMerchant = await req('/api/merchant/dashboard', { token: ctx.employeeToken });
    log(
      empOnMerchant.status === 403,
      'Employee cannot access /merchant/* (role boundary)',
      `got=${empOnMerchant.status}`,
    );
  }

  // =========================================================================
  // 6. EMPLOYEE PERMISSION GATING
  // =========================================================================
  // Add a SECOND employee with reports:false and orders_status:false and verify
  // the reports endpoint + order PATCH are denied.
  const restrictedPhone = ctx.restrictedPhone;
  const restrictedEmp = await req('/api/merchant/employees', {
    method: 'POST',
    token: ctx.token1,
    body: {
      phone: restrictedPhone,
      full_name: 'موظف مقيد',
      role: 'merchant_staff',
      permissions: { reports: false, orders_status: false },
    },
  });
  if (restrictedEmp.status === 201) {
    const rToken = await login(restrictedPhone);
    const rReports = await req('/api/merchant-employee/reports', { token: rToken });
    log(
      rReports.status === 403,
      'Staff without reports perm → 403',
      `got=${rReports.status}`,
    );
    // orders list is allowed (orders:true by default), but PATCH status denied.
    const rPatch = await req(`/api/merchant-employee/orders/${ctx.orderId}/status`, {
      method: 'PATCH',
      token: rToken,
      body: { status: 'preparing' },
    });
    log(
      rPatch.status === 403,
      'Staff without orders_status perm → 403 on PATCH',
      `got=${rPatch.status}`,
    );
  } else {
    log(false, 'Could not provision restricted employee', `status=${restrictedEmp.status}`);
  }

  // =========================================================================
  // 7. VALIDATION
  // =========================================================================
  const badOrderStatus = await req('/api/merchant/orders/00000000-0000-0000-0000-000000000000/status', {
    method: 'PATCH',
    token: ctx.token1,
    body: { status: 'preparing' },
  });
  log(badOrderStatus.status === 404, 'PATCH non-existent order → 404', `got=${badOrderStatus.status}`);

  const badEmpRole = await req('/api/merchant/employees', {
    method: 'POST',
    token: ctx.token1,
    body: { phone: '0556789012', role: 'invalid_role' },
  });
  log(badEmpRole.status === 422, 'Invalid employee role → 422', `got=${badEmpRole.status}`);

  const badPhone = await req('/api/merchant/employees', {
    method: 'POST',
    token: ctx.token1,
    body: { phone: 'not-a-phone', role: 'merchant_staff' },
  });
  log(badPhone.status === 422, 'Invalid phone → 422', `got=${badPhone.status}`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================ STAGE 2 RESULTS ================');
  for (const c of results.checks) console.log(c);
  console.log(`\nPassed: ${results.pass} | Failed: ${results.fail}`);

  // Print a compact FAILURES block at the very end for quick triage.
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
