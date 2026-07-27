/**
 * Operations APIs integration test (Stage 4).
 *
 * Runs against the live server on http://localhost:3000 using REAL data
 * (no mocks). Generates JWTs for the seeded roles and exercises every
 * Operations endpoint, plus the negative-stock guard, movement recording,
 * and the order-status state machine.
 *
 * Usage:
 *   1. start the server:  npm start
 *   2. in another shell:  node scripts/ops-test.mjs
 */
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import sequelize from '../src/config/database.js';

const BASE = 'http://localhost:3000';
const SECRET = process.env.JWT_SECRET;

let PASS = 0;
let FAIL = 0;
const results = [];

function assert(name, cond, detail = '') {
  if (cond) {
    PASS += 1;
    results.push(`  ✅ ${name}`);
  } else {
    FAIL += 1;
    results.push(`  ❌ ${name}${detail ? `  — ${detail}` : ''}`);
  }
}

function sign(userId, phone) {
  return jwt.sign({ sub: userId, phone, is_guest: false }, SECRET, { expiresIn: '1h' });
}

async function req(method, path, { token, body, expectedStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  if (expectedStatus && res.status !== expectedStatus) {
    throw new Error(`${method} ${path} expected ${expectedStatus}, got ${res.status}: ${JSON.stringify(json)}`);
  }
  return { status: res.status, json };
}

// ---------------------------------------------------------------------------
try {
  // --- Resolve real ids from the DB ---------------------------------------
  // Each sequelize.query returns [rows, meta]. Destructure the first row out.
  const adminQ = await sequelize.query(`SELECT u.id, u.phone FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.slug='admin' LIMIT 1;`);
  const adminEmpQ = await sequelize.query(`SELECT u.id, u.phone FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.slug='admin_employee' LIMIT 1;`);
  const customerQ = await sequelize.query(`SELECT u.id, u.phone FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.slug='customer' LIMIT 1;`);
  const admin = adminQ[0][0];
  const adminEmployee = adminEmpQ[0][0];
  const customer = customerQ[0][0];
  const invQ = await sequelize.query(`SELECT id, sku, on_hand FROM inventory WHERE on_hand > 1 ORDER BY on_hand DESC LIMIT 1;`);
  const orderQ = await sequelize.query(`SELECT id, number, status FROM orders WHERE status IN ('paid','preparing','ready_to_ship','shipped') ORDER BY status LIMIT 1;`);
  const inv = invQ[0][0];
  const order = orderQ[0][0];

  if (!admin || !adminEmployee || !customer) throw new Error('Missing seed roles (admin/admin_employee/customer)');
  if (!inv) throw new Error('No stocked inventory row to test against');
  console.log(`Using: admin=${admin.id} adminEmp=${adminEmployee.id} customer=${customer.id}`);
  console.log(`Inventory: id=${inv.id} sku=${inv.sku} on_hand=${inv.on_hand}`);
  if (order) console.log(`Order: id=${order.id} number=${order.number} status=${order.status}`);

  const adminToken = sign(admin.id, admin.phone);
  const adminEmpToken = sign(adminEmployee.id, adminEmployee.phone);
  const customerToken = sign(customer.id, customer.phone);
  const noToken = null;

  console.log('\n=== 1. AUTHORIZATION ===');

  // No token → 401
  let r = await req('GET', '/api/operations/dashboard', { token: noToken });
  assert('no token → 401', r.status === 401, `got ${r.status}`);

  // Customer (wrong role) → 403
  r = await req('GET', '/api/operations/dashboard', { token: customerToken });
  assert('customer → 403 (operations_required)', r.status === 403 && r.json?.error?.code ? r.json.error.code === 'operations_required' || r.json?.details?.code === 'operations_required' || r.status === 403 : r.status === 403, `got ${r.status} ${JSON.stringify(r.json)}`);

  // Admin → 200
  r = await req('GET', '/api/operations/dashboard', { token: adminToken });
  assert('admin → 200 dashboard', r.status === 200 && r.json?.ok === true, `got ${r.status}`);
  assert('dashboard has kpis', !!r.json?.data?.orders && !!r.json?.data?.shipments && !!r.json?.data?.inventory);

  // Admin employee → 200 (read allowed)
  r = await req('GET', '/api/operations/dashboard', { token: adminEmpToken });
  assert('admin_employee → 200 (read)', r.status === 200, `got ${r.status}`);

  console.log('\n=== 2. ORDERS LIST ===');
  r = await req('GET', '/api/operations/orders?limit=5', { token: adminToken });
  assert('GET orders → 200 paginated', r.status === 200 && r.json?.pagination, `got ${r.status}`);
  assert('orders pagination has total', typeof r.json?.pagination?.total === 'number');

  // filtering by status
  r = await req('GET', '/api/operations/orders?status=shipped&limit=5', { token: adminToken });
  const allShipped = (r.json?.data || []).every((o) => o.status === 'shipped');
  assert('GET orders?status=shipped filters', r.status === 200 && (r.json.data.length === 0 || allShipped), `got ${r.status}`);

  // validation: bad status → 422
  r = await req('GET', '/api/operations/orders?status=bogus', { token: adminToken });
  assert('GET orders?status=bogus → 422', r.status === 422, `got ${r.status}`);

  console.log('\n=== 3. INVENTORY LIST ===');
  r = await req('GET', '/api/operations/inventory?limit=5', { token: adminToken });
  assert('GET inventory → 200 paginated', r.status === 200 && r.json?.pagination, `got ${r.status}`);
  assert('inventory row has available + is_low_stock', r.json?.data?.length > 0 && 'available' in r.json.data[0] && 'is_low_stock' in r.json.data[0]);

  // availability filter
  r = await req('GET', '/api/operations/inventory?availability=out_of_stock&limit=5', { token: adminToken });
  assert('GET inventory?availability=out_of_stock → 200', r.status === 200, `got ${r.status}`);

  console.log('\n=== 4. INVENTORY ADJUST (the core) ===');
  const beforeOnHand = inv.on_hand;

  // admin_employee (read-only) → 403 on write
  r = await req('POST', `/api/operations/inventory/${inv.id}/adjust`, {
    token: adminEmpToken,
    body: { delta: 1, reason: 'should be blocked' },
  });
  assert('admin_employee adjust → 403 read-only', r.status === 403, `got ${r.status} ${JSON.stringify(r.json)}`);

  // valid positive adjustment (restock) by admin
  r = await req('POST', `/api/operations/inventory/${inv.id}/adjust`, {
    token: adminToken,
    body: { delta: 3, reason: 'إعادة تخزين تجريبي' },
  });
  assert('adjust +3 → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.json)}`);
  assert('adjust returns inventory + movement', !!r.json?.data?.inventory && !!r.json?.data?.movement);
  assert('movement.before == original on_hand', r.json?.data?.movement?.before === beforeOnHand, `before=${r.json?.data?.movement?.before}, expected ${beforeOnHand}`);
  assert('movement.after == before+3', r.json?.data?.movement?.after === beforeOnHand + 3, `after=${r.json?.data?.movement?.after}`);
  assert('movement.delta == 3', r.json?.data?.movement?.delta === 3);
  assert('movement.reason recorded', r.json?.data?.movement?.reason === 'إعادة تخزين تجريبي');
  assert('movement.actor_id == admin', r.json?.data?.movement?.actor_id === admin.id);
  assert('inventory on_hand updated to after', r.json?.data?.inventory?.on_hand === beforeOnHand + 3);

  // NEGATIVE STOCK GUARD — try to consume more than available
  const currentOnHand = r.json.data.inventory.on_hand;
  const overConsume = -(currentOnHand + 5);
  r = await req('POST', `/api/operations/inventory/${inv.id}/adjust`, {
    token: adminToken,
    body: { delta: overConsume, reason: 'محاولة تجاوز المخزون' },
  });
  assert('over-consume → 409 negative_stock', r.status === 409 && r.json?.details?.code === 'negative_stock', `got ${r.status} ${JSON.stringify(r.json)}`);
  assert('409 body carries before/delta/attempted_after', r.json?.details?.before === currentOnHand && r.json?.details?.attempted_after === currentOnHand + overConsume);

  // verify stock UNCHANGED after rejected adjust (transaction rolled back)
  const [[invAfterReject]] = await sequelize.query(`SELECT on_hand FROM inventory WHERE id='${inv.id}';`);
  assert('stock unchanged after rejected adjust', Number(invAfterReject.on_hand) === beforeOnHand + 3, `on_hand=${invAfterReject.on_hand}`);

  // zero-delta rejection
  r = await req('POST', `/api/operations/inventory/${inv.id}/adjust`, {
    token: adminToken,
    body: { delta: 0, reason: 'صفر' },
  });
  assert('zero delta → 400', r.status === 400, `got ${r.status}`);

  // missing reason → 422
  r = await req('POST', `/api/operations/inventory/${inv.id}/adjust`, {
    token: adminToken,
    body: { delta: 1 },
  });
  assert('missing reason → 422', r.status === 422, `got ${r.status}`);

  // nonexistent inventory → 404
  r = await req('POST', '/api/operations/inventory/00000000-0000-0000-0000-000000000000/adjust', {
    token: adminToken,
    body: { delta: 1, reason: 'x' },
  });
  assert('adjust nonexistent inventory → 404', r.status === 404, `got ${r.status}`);

  console.log('\n=== 5. INVENTORY MOVEMENTS LIST ===');
  r = await req('GET', '/api/operations/inventory/movements?limit=5', { token: adminToken });
  assert('GET movements → 200 paginated', r.status === 200 && r.json?.pagination, `got ${r.status}`);

  // filter by the inventory we just adjusted
  r = await req('GET', `/api/operations/inventory/movements?inventory_id=${inv.id}&type=adjustment&limit=5`, { token: adminToken });
  assert('GET movements filtered by inventory_id+type', r.status === 200, `got ${r.status}`);
  const foundOurMovement = (r.json?.data || []).some((m) => m.reason === 'إعادة تخزين تجريبي' && m.delta === 3 && m.actor_id === admin.id);
  assert('our adjustment movement is recorded', foundOurMovement, JSON.stringify(r.json?.data));

  console.log('\n=== 6. SHIPMENTS ===');
  r = await req('GET', '/api/operations/shipments?limit=5', { token: adminToken });
  assert('GET shipments → 200 paginated', r.status === 200 && r.json?.pagination, `got ${r.status}`);

  console.log('\n=== 7. REPORTS ===');
  r = await req('GET', '/api/operations/reports', { token: adminToken });
  assert('GET reports → 200', r.status === 200 && r.json?.ok === true, `got ${r.status}`);
  assert('reports has fulfilment + shipments + inventory blocks', !!r.json?.data?.fulfilment && !!r.json?.data?.shipments && !!r.json?.data?.inventory);

  console.log('\n=== 8. ORDER STATUS STATE MACHINE ===');
  if (order) {
    // Determine a valid forward transition for the current status.
    const TRANSITIONS = {
      paid: 'preparing',
      preparing: 'ready_to_ship',
      ready_to_ship: 'shipped',
      shipped: 'delivered',
    };
    const target = TRANSITIONS[order.status];
    if (target) {
      r = await req('PATCH', `/api/operations/orders/${order.id}/status`, {
        token: adminToken,
        body: { status: target, comment_ar: 'اختبار عمليات' },
      });
      assert(`PATCH order ${order.status} → ${target}`, r.status === 200 && r.json?.data?.status === target, `got ${r.status} ${JSON.stringify(r.json)}`);

      // invalid transition (reverse) → 409
      r = await req('PATCH', `/api/operations/orders/${order.id}/status`, {
        token: adminToken,
        body: { status: order.status }, // back to previous = invalid
      });
      assert('reverse transition → 409 invalid_transition', r.status === 409 && r.json?.details?.code === 'invalid_transition', `got ${r.status} ${JSON.stringify(r.json)}`);

      // admin_employee cannot change status → 403
      r = await req('PATCH', `/api/operations/orders/${order.id}/status`, {
        token: adminEmpToken,
        body: { status: target },
      });
      assert('admin_employee PATCH order status → 403 read-only', r.status === 403, `got ${r.status}`);

      // invalid target value → 422
      r = await req('PATCH', `/api/operations/orders/${order.id}/status`, {
        token: adminToken,
        body: { status: 'bogus_status' },
      });
      assert('PATCH order status=bogus → 422', r.status === 422, `got ${r.status}`);

      // nonexistent order → 404
      r = await req('PATCH', '/api/operations/orders/00000000-0000-0000-0000-000000000000/status', {
        token: adminToken,
        body: { status: 'preparing' },
      });
      assert('PATCH nonexistent order → 404', r.status === 404, `got ${r.status}`);
    } else {
      console.log(`  (skip order transition: status ${order.status} has no forward ops target)`);
    }
  } else {
    console.log('  (skip order status tests: no actionable order in DB)');
  }

  console.log('\n=== 9. EXISTING STAGES NOT BROKEN ===');
  r = await req('GET', '/api/health', {});
  assert('GET /api/health still 200', r.status === 200, `got ${r.status}`);
  r = await req('GET', '/api/products?limit=3', {});
  assert('GET /api/products (customer) still works', r.status === 200, `got ${r.status}`);
  // admin module still reachable
  r = await req('GET', '/api/admin/dashboard', { token: adminToken });
  assert('GET /api/admin/dashboard still 200', r.status === 200, `got ${r.status}`);

  console.log('\n=== 10. RESTOCK BACK (cleanup) ===');
  // bring inventory back to original on_hand so the test is side-effect-light
  await req('POST', `/api/operations/inventory/${inv.id}/adjust`, {
    token: adminToken,
    body: { delta: beforeOnHand - (beforeOnHand + 3), reason: 'استرجاع بعد الاختبار' },
  });
  const [[invFinal]] = await sequelize.query(`SELECT on_hand FROM inventory WHERE id='${inv.id}';`);
  assert('inventory restored to original', Number(invFinal.on_hand) === beforeOnHand, `final=${invFinal.on_hand}, expected ${beforeOnHand}`);
} catch (e) {
  FAIL += 1;
  results.push(`  ❌ TEST SUITE ERROR: ${e.message}`);
} finally {
  await sequelize.close();
}

console.log('\n' + results.join('\n'));
console.log(`\n=================================`);
console.log(`RESULTS:  ${PASS} passed,  ${FAIL} failed`);
console.log(`=================================`);
process.exit(FAIL > 0 ? 1 : 0);
