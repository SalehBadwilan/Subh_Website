/**
 * Order-status state-machine integration test (Stage 4, Operations).
 *
 * Drives ONE real order through the full Operations fulfilment lifecycle via the
 * PATCH endpoint, asserting every allowed transition AND that forbidden ones are
 * rejected. The order is reset to its original state at the end (best-effort) so
 * the test leaves no lasting side effect.
 *
 * Usage (server must be running on :3000):
 *   node scripts/ops-test-order-cycle.mjs
 */
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import sequelize from '../src/config/database.js';

const BASE = 'http://localhost:3000';
const SECRET = process.env.JWT_SECRET;
let PASS = 0, FAIL = 0;
const out = [];
const ok = (n, c, d = '') => { c ? (PASS++, out.push(`  ✅ ${n}`)) : (FAIL++, out.push(`  ❌ ${n}${d ? `  — ${d}` : ''}`)); };

function sign(id, phone) { return jwt.sign({ sub: id, phone, is_guest: false }, SECRET, { expiresIn: '1h' }); }
async function patch(token, orderId, status, body = {}) {
  const res = await fetch(`${BASE}/api/operations/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, ...body }),
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

try {
  // pick an admin token + the delivered order (we will reset it to 'paid' for the test)
  const adminQ = await sequelize.query(`SELECT u.id, u.phone FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.slug='admin' LIMIT 1;`);
  const orderQ = await sequelize.query(`SELECT id, number, status FROM orders WHERE status IN ('paid','preparing','ready_to_ship','shipped','delivered') ORDER BY updated_at DESC LIMIT 1;`);
  const admin = adminQ[0][0];
  const order = orderQ[0][0];
  if (!admin || !order) throw new Error('need an admin + a fulfilment-stage order');
  const token = sign(admin.id, admin.phone);
  const ORIGINAL_STATUS = order.status;
  console.log(`Order ${order.number} current=${ORIGINAL_STATUS}. Resetting to 'paid' for the lifecycle test.`);

  // --- Reset to 'paid' so we can exercise the full forward chain ----------
  // Done at the DB level because the state machine intentionally forbids the
  // reverse jump (that restriction itself is one of the things we test below).
  // NOTE: orders table has no shipped_at column — shipping timestamps live on
  // the shipments row, so we only clear cancelled_at here.
  const t = await sequelize.transaction();
  try {
    await sequelize.query(`UPDATE orders SET status='paid', cancelled_at=NULL, paid_at=COALESCE(paid_at, NOW()) WHERE id='${order.id}';`, { transaction: t });
    await sequelize.query(`UPDATE shipments SET status='pending', shipped_at=NULL, delivered_at=NULL WHERE order_id='${order.id}';`, { transaction: t });
    await t.commit();
  } catch (e) { await t.rollback(); throw e; }

  // === full forward lifecycle: paid → preparing → ready_to_ship → shipped → delivered
  const chain = ['preparing', 'ready_to_ship', 'shipped', 'delivered'];
  for (const target of chain) {
    const r = await patch(token, order.id, target, { comment_ar: `خطوة دورة: ${target}` });
    ok(`forward → ${target} (200)`, r.status === 200 && r.json?.data?.status === target, `got ${r.status} ${JSON.stringify(r.json)}`);
  }

  // delivered is terminal → cannot go anywhere (e.g. delivered → shipped forbidden)
  let r = await patch(token, order.id, 'shipped');
  ok('delivered → shipped rejected (409)', r.status === 409 && r.json?.details?.code === 'invalid_transition', `got ${r.status}`);

  // === invalid target enum → 422
  r = await patch(token, order.id, 'bogus');
  ok('invalid target value → 422', r.status === 422, `got ${r.status}`);

  // === cancellation branch: paid → cancelled (needs reset back to paid first)
  await sequelize.query(`UPDATE orders SET status='paid', cancelled_at=NULL WHERE id='${order.id}';`);
  await sequelize.query(`UPDATE shipments SET status='pending', shipped_at=NULL, delivered_at=NULL WHERE order_id='${order.id}';`);
  r = await patch(token, order.id, 'cancelled', { comment_ar: 'إلغاء' });
  ok('paid → cancelled (200)', r.status === 200 && r.json?.data?.status === 'cancelled', `got ${r.status} ${JSON.stringify(r.json)}`);
  // cancelled is terminal
  r = await patch(token, order.id, 'preparing');
  ok('cancelled → preparing rejected (409)', r.status === 409, `got ${r.status}`);

  // === shipment linkage: when order → delivered, shipment.status must be 'delivered'
  await sequelize.query(`UPDATE orders SET status='shipped', cancelled_at=NULL WHERE id='${order.id}';`);
  await sequelize.query(`UPDATE shipments SET status='handed_to_carrier', shipped_at=NOW() WHERE order_id='${order.id}';`);
  r = await patch(token, order.id, 'delivered');
  ok('shipped → delivered (200)', r.status === 200, `got ${r.status}`);
  const [[shp]] = await sequelize.query(`SELECT status, delivered_at FROM shipments WHERE order_id='${order.id}';`);
  ok('linked shipment advanced to delivered', shp?.status === 'delivered' && !!shp?.delivered_at, `shipment=${JSON.stringify(shp)}`);

  // === order_status_history row was appended for each transition
  const [[hist]] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM order_status_history WHERE order_id='${order.id}';`);
  ok('OrderStatusHistory rows appended', Number(hist?.c) >= 5, `count=${hist?.c}`);

  // === admin_employee (read-only) cannot PATCH → 403
  await sequelize.query(`UPDATE orders SET status='paid', cancelled_at=NULL WHERE id='${order.id}';`);
  const aeQ = await sequelize.query(`SELECT u.id, u.phone FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.slug='admin_employee' LIMIT 1;`);
  const ae = aeQ[0][0];
  r = await patch(sign(ae.id, ae.phone), order.id, 'preparing');
  ok('admin_employee PATCH → 403 read-only', r.status === 403, `got ${r.status}`);

  // === nonexistent order → 404
  r = await patch(token, '00000000-0000-0000-0000-000000000000', 'preparing');
  ok('nonexistent order → 404', r.status === 404, `got ${r.status}`);

  // --- restore the order to its ORIGINAL status --------------------------
  // orders table carries no shipping timestamps (those live on shipments), so
  // we only restore the status enum + cancelled_at; shipments row is reset to a
  // state consistent with the original order status.
  const t2 = await sequelize.transaction();
  try {
    await sequelize.query(`UPDATE orders SET status='${ORIGINAL_STATUS}', cancelled_at=NULL WHERE id='${order.id}';`, { transaction: t2 });
    if (ORIGINAL_STATUS === 'shipped')
      await sequelize.query(`UPDATE shipments SET status='handed_to_carrier', shipped_at=NOW(), delivered_at=NULL WHERE order_id='${order.id}';`, { transaction: t2 });
    else if (ORIGINAL_STATUS === 'delivered')
      await sequelize.query(`UPDATE shipments SET status='delivered', shipped_at=NOW(), delivered_at=NOW() WHERE order_id='${order.id}';`, { transaction: t2 });
    else
      await sequelize.query(`UPDATE shipments SET status='pending', shipped_at=NULL, delivered_at=NULL WHERE order_id='${order.id}';`, { transaction: t2 });
    await t2.commit();
    out.push(`  ↩️  restored order ${order.number} to '${ORIGINAL_STATUS}'`);
  } catch (e) { await t2.rollback(); out.push(`  ⚠️ could not restore order: ${e.message}`); }
} catch (e) {
  FAIL++; out.push(`  ❌ SUITE ERROR: ${e.message}`);
} finally {
  await sequelize.close();
}
console.log('\n' + out.join('\n'));
console.log(`\n=== ORDER-STATE-MACHINE: ${PASS} passed, ${FAIL} failed ===`);
process.exit(FAIL > 0 ? 1 : 0);
