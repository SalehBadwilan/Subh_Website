/**
 * Integration test for the FULL payment flow (Backend).
 *
 * Verifies:
 *  1. create order (POST /api/orders) → status pending_payment
 *  2. initiate payment (POST /api/payments/initiate) → Payment(initiated) + intent
 *  3. confirm payment (POST /api/payments/:id/confirm) → Payment(captured)
 *  4. order becomes 'paid' + invoice issued + notification created
 *  5. webhook idempotency: replaying the same event_id is a no-op
 *  6. failed payment does NOT mark the order paid
 *
 * Uses the built-in 'test' provider (no external keys).
 */
import env from '../src/config/env.js';
import { bootApp } from '../src/app.js';
import sequelize from '../src/config/database.js';

const BASE = `http://127.0.0.1:${env.port}`;
let token = '';
let userId = '';
const checks = [];

function log(ok, name, extra = '') {
  checks.push(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (auth && token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch { /* */ }
  return { status: res.status, json };
}

async function main() {
  const { app, models } = await bootApp();
  const server = await new Promise((r) => { const s = app.listen(env.port, () => r(s)); });
  console.log('payment-flow test on', BASE, '(provider:', env.payment.provider, ')');

  try {
    // --- seed: merchant + active product + inventory (for the order) ---
    const { Product, Inventory, Merchant, MerchantProduct, User } = models;
    let merchant = await Merchant.findOne();
    if (!merchant) {
      const u = await User.create({
        email: `mtest_${Date.now()}@subh.test`,
        phone: `05${Math.floor(Math.random() * 89999999) + 10000000}`,
        password_hash: 'x', full_name: 'Test Merchant',
      });
      merchant = await Merchant.create({
        user_id: u.id, commercial_name: 'Test Store',
        commercial_registration_no: `CR${Date.now()}`,
        iban: `SA${Date.now().toString().slice(-20).padStart(20, '0')}`,
      });
    }
    const prod = await Product.create({
      sku: `PAYT${Date.now()}`, slug: `payt${Date.now()}`, name_ar: 'منتج اختبار الدفع',
      price_sar: 250, vat_rate: 0.15, status: 'active', weight_grams: 100, is_package: false,
    });
    await Inventory.create({ sellable_type: 'product', sellable_id: prod.id, sku: prod.sku, on_hand: 10, reserved: 0, reorder_threshold: 1 });
    await MerchantProduct.create({ merchant_id: merchant.id, product_id: prod.id, is_active: true });
    console.log('seeded merchant/product/inventory');

    // --- auth ---
    let r = await api('/api/auth/otp/request', { method: 'POST', auth: false, body: { phone: '0512345678' } });
    const code = r.json.data.devOtp;
    r = await api('/api/auth/otp/verify', { method: 'POST', auth: false, body: { phone: '0512345678', otp: code } });
    token = r.json.data.token;
    userId = r.json.data.user.id;

    // --- create address ---
    r = await api('/api/addresses', { method: 'POST', body: { recipient_name: 'عميل', phone: '0512345678', line1: 'شارع', city: 'الرياض', region: 'الرياض' } });
    const addrId = r.json.data.id;

    // --- 1) create order ---
    r = await api('/api/orders', { method: 'POST', body: { shipping_address_id: addrId, items: [{ product_id: prod.id, quantity: 1 }] } });
    log(r.status === 201, '1. POST /api/orders → 201', `status=${r.status}`);
    const orderId = r.json.data.id;
    const orderTotal = r.json.data.total_sar;
    console.log('   order created total=' + orderTotal + ' status=' + r.json.data.status);

    // --- 2) initiate payment ---
    r = await api('/api/payments/initiate', { method: 'POST', body: { order_id: orderId, method: 'card' } });
    log(r.status === 201 && r.json.data.payment.status === 'initiated', '2. POST /api/payments/initiate → initiated', `status=${r.status} payment.status=${r.json.data.payment?.status}`);
    log(!!r.json.data.intent.client_secret, '   intent.client_secret present');
    const paymentId = r.json.data.payment.id;
    const providerRef = r.json.data.payment.provider_reference;
    console.log('   payment=' + paymentId + ' ref=' + providerRef);

    // --- initiate again (idempotent: reuse initiated payment) ---
    r = await api('/api/payments/initiate', { method: 'POST', body: { order_id: orderId, method: 'card' } });
    log(r.status === 201 && r.json.data.payment.id === paymentId, '2b. re-initiate reuses same payment', `sameId=${r.json.data.payment?.id === paymentId}`);

    // --- 3) confirm payment (success) ---
    r = await api(`/api/payments/${paymentId}/confirm`, { method: 'POST', body: { source: { last4: '4242' } } });
    log(r.status === 200 && r.json.data.status === 'captured', '3. POST /api/payments/:id/confirm → captured', `status=${r.status} data.status=${r.json.data?.status}`);

    // --- 4) verify order paid + invoice + notification ---
    r = await api(`/api/orders/${orderId}`);
    log(r.status === 200 && r.json.data.status === 'paid', '4a. order status = paid', `order.status=${r.json.data?.status}`);
    log(!!r.json.data.paid_at, '4b. order.paid_at set', `paid_at=${r.json.data?.paid_at}`);

    const invoice = await models.Invoice.findOne({ where: { order_id: orderId } });
    log(!!invoice, '4c. invoice created', `number=${invoice?.number} total=${invoice?.total_sar}`);

    const notifs = await models.Notification.findAll({ where: { user_id: userId } });
    log(notifs.length > 0 && notifs.some((n) => n.title_ar.includes('الدفع')), '4d. payment notification created', `count=${notifs.length}`);

    const history = await models.OrderStatusHistory.findAll({ where: { order_id: orderId }, order: [['created_at', 'ASC']] });
    log(history.some((h) => h.to_status === 'paid'), '4e. status history recorded paid', `entries=${history.length}`);

    // --- 5) webhook idempotency ---
    const webhookPayload = {
      event_id: `test_evt_${orderId}`,
      event_type: 'payment.captured',
      reference: providerRef,
      status: 'captured',
      amount_sar: orderTotal,
    };
    r = await api('/api/webhooks/payments', { method: 'POST', auth: false, body: webhookPayload });
    log(r.status === 200, '5a. webhook accepted → 200', `status=${r.status}`);
    const events1 = await models.PaymentEvent.count({ where: { event_id: webhookPayload.event_id } });
    // replay
    r = await api('/api/webhooks/payments', { method: 'POST', auth: false, body: webhookPayload });
    const events2 = await models.PaymentEvent.count({ where: { event_id: webhookPayload.event_id } });
    log(events1 === 1 && events2 === 1, '5b. webhook replay is idempotent', `events before=${events1} after=${events2}`);

    // --- 6) failed payment path ---
    // new order + payment, confirm with a "declined" card (last4 ends 0002)
    r = await api('/api/orders', { method: 'POST', body: { shipping_address_id: addrId, items: [{ product_id: prod.id, quantity: 1 }] } });
    const failOrderId = r.json.data.id;
    r = await api('/api/payments/initiate', { method: 'POST', body: { order_id: failOrderId, method: 'card' } });
    const failPaymentId = r.json.data.payment.id;
    r = await api(`/api/payments/${failPaymentId}/confirm`, { method: 'POST', body: { source: { last4: '0002' } } });
    log(r.status === 200 && r.json.data.status === 'failed', '6a. declined card → payment failed', `status=${r.status} data.status=${r.json.data?.status}`);
    r = await api(`/api/orders/${failOrderId}`);
    log(r.json.data.status === 'pending_payment', '6b. failed payment keeps order pending_payment', `order.status=${r.json.data?.status}`);

    console.log('\n================ PAYMENT FLOW RESULTS ================');
    for (const c of checks) console.log(c);
    const pass = checks.filter((c) => c.startsWith('✅')).length;
    const fail = checks.filter((c) => c.startsWith('❌')).length;
    console.log(`\nPassed: ${pass} | Failed: ${fail}`);
    if (fail > 0) process.exitCode = 1;
  } catch (e) {
    console.error('TEST CRASHED:', e.message);
    if (e.details) console.error('  details:', JSON.stringify(e.details));
    process.exitCode = 1;
  } finally {
    server.close();
    await sequelize.close().catch(() => {});
  }
}

main();
