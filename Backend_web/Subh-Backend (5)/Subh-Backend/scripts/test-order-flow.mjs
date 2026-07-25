/**
 * Order creation integration test (Customer APIs Stage 1).
 *
 * Verifies the critical order/stock semantics:
 *  - POST /api/orders with available stock → 201, stock decremented, movement logged
 *  - POST /api/orders exceeding stock → 409 (no partial mutation)
 *
 * Seeds the minimum data needed (merchant, active product, inventory, merchant
 * authorization), then drives the HTTP routes in-process.
 */
import env from '../src/config/env.js';
import { bootApp } from '../src/app.js';
import sequelize from '../src/config/database.js';

const BASE = `http://127.0.0.1:${env.port}`;

async function main() {
  const { app, models } = await bootApp();
  const { Product, Inventory, Merchant, MerchantProduct, User } = models;
  const server = await new Promise((resolve) => {
    const s = app.listen(env.port, () => resolve(s));
  });
  console.log('order-flow test listening on', BASE);

  try {
    // --- minimal seed ---
    let merchant = await Merchant.findOne();
    if (!merchant) {
      const u = await User.create({
        email: `mtest_${Date.now()}@subh.test`,
        phone: `05${Math.floor(Math.random() * 89999999) + 10000000}`,
        password_hash: 'x',
        full_name: 'Test Merchant',
      });
      merchant = await Merchant.create({
        user_id: u.id,
        commercial_name: 'Test Store',
        commercial_registration_no: `CR${Date.now()}`,
        iban: `SA${Date.now().toString().slice(-20).padStart(20, '0')}`,
      });
    }
    const prod = await Product.create({
      sku: `ORDT${Date.now()}`,
      slug: `ordt${Date.now()}`,
      name_ar: 'منتج اختبار الطلب',
      price_sar: 100,
      vat_rate: 0.15,
      status: 'active',
      weight_grams: 100,
      is_package: false,
    });
    await Inventory.create({
      sellable_type: 'product',
      sellable_id: prod.id,
      sku: prod.sku,
      on_hand: 2,
      reserved: 0,
      reorder_threshold: 1,
    });
    await MerchantProduct.create({ merchant_id: merchant.id, product_id: prod.id, is_active: true });
    console.log('seeded: merchant, product, inventory(on_hand=2), merchant_product');

    // --- customer auth ---
    const r1 = await fetch(`${BASE}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0588889991' }),
    });
    const j1 = await r1.json();
    const code = j1.data.devOtp;
    const r2 = await fetch(`${BASE}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0588889991', otp: code }),
    });
    const j2 = await r2.json();
    const tok = j2.data.token;
    const H = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };

    // --- create address ---
    const r3 = await fetch(`${BASE}/api/addresses`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        recipient_name: 'عميل اختبار',
        phone: '0588889991',
        line1: 'حي الاختبار',
        city: 'الرياض',
        region: 'منطقة الرياض',
      }),
    });
    const j3 = await r3.json();
    const addrId = j3.data.id;

    // --- TEST 1: order qty=2 (== on_hand) → expect 201 ---
    const r4 = await fetch(`${BASE}/api/orders`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ shipping_address_id: addrId, items: [{ product_id: prod.id, quantity: 2 }] }),
    });
    const j4 = await r4.json();
    console.log('TEST1 (qty=2 == on_hand) → status=' + r4.status + ' ok=' + j4.ok + ' number=' + (j4.data && j4.data.number));
    console.log('       totals subtotal=' + (j4.data && j4.data.subtotal_sar) + ' vat=' + (j4.data && j4.data.vat_sar) + ' total=' + (j4.data && j4.data.total_sar));
    const ok1 = r4.status === 201 && !!j4.data.id;

    // --- TEST 2: order qty=1 again → expect 409 (out of stock) ---
    const r5 = await fetch(`${BASE}/api/orders`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ shipping_address_id: addrId, items: [{ product_id: prod.id, quantity: 1 }] }),
    });
    const j5 = await r5.json();
    console.log('TEST2 (qty=1 out of stock) → status=' + r5.status + ' error=' + j5.error);
    const ok2 = r5.status === 409;

    // --- verify stock decremented + movement recorded ---
    const inv = await Inventory.findOne({ where: { sellable_id: prod.id } });
    const sm = await models.StockMovement.findAll({ where: { inventory_id: inv.id } });
    console.log('POST_INVENTORY on_hand=' + inv.on_hand + ' (expect 0)');
    console.log('POST_STOCKMOV count=' + sm.length + ' type=' + sm[0]?.type + ' delta=' + sm[0]?.delta);
    const ok3 = inv.on_hand === 0 && sm.length >= 1 && sm[0].type === 'consume' && sm[0].delta === -2;

    // --- GET the created order back ---
    const r6 = await fetch(`${BASE}/api/orders/${j4.data.id}`, { headers: H });
    const j6 = await r6.json();
    console.log('TEST3 (GET created order) → status=' + r6.status + ' items=' + (j6.data && j6.data.items && j6.data.items.length));
    const ok4 = r6.status === 200 && j6.data.items.length === 1;

    const allPass = ok1 && ok2 && ok3 && ok4;
    console.log('\nORDER FLOW: ' + (allPass ? 'ALL PASS ✅' : 'FAIL ❌') + ' (ok1=' + ok1 + ' ok2=' + ok2 + ' ok3=' + ok3 + ' ok4=' + ok4 + ')');
    if (!allPass) process.exitCode = 1;
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
