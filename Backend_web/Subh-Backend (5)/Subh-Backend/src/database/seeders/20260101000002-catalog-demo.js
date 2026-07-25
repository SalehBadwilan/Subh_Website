'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seed: demo catalog — categories, products, a package, a merchant, allowed
 * merchant products, and inventory. Everything is clearly marked as demo and
 * uses non-misleading prices (whole numbers, SAR).
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const base = { created_at: now, updated_at: now };

    // --- categories ---------------------------------------------------------
    const categories = [
      { slug: 'electronics', name_ar: 'إلكترونيات' },
      { slug: 'phones', name_ar: 'جوالات', parent: 'electronics' },
      { slug: 'accessories', name_ar: 'ملحقات', parent: 'electronics' },
      { slug: 'home', name_ar: 'منزل' },
    ].map((c) => ({ id: uuidv4(), ...c, parent_id: null, is_active: true, sort_order: 0, ...base }));
    // wire parent
    categories.forEach((c) => {
      if (c.parent) c.parent_id = categories.find((p) => p.slug === c.parent).id;
    });
    await queryInterface.bulkInsert(
      'categories',
      categories.map(({ parent, ...rest }) => rest),
    );

    // --- products -----------------------------------------------------------
    const products = [
      { sku: 'DEMO-PHONE-001', slug: 'demo-phone-001', name_ar: 'جوال تجريبي 1', price_sar: 2000 },
      { sku: 'DEMO-PHONE-002', slug: 'demo-phone-002', name_ar: 'جوال تجريبي 2', price_sar: 1500 },
      { sku: 'DEMO-CHARGER-001', slug: 'demo-charger-001', name_ar: 'شاحن تجريبي', price_sar: 80 },
    ].map((p) => ({
      id: uuidv4(),
      category_id: categories.find((c) => c.slug === (p.sku.includes('CHARGER') ? 'accessories' : 'phones')).id,
      ...p,
      description_ar: 'منتج تجريبي لأغراض التحقق من الربط فقط',
      vat_rate: 0.15,
      status: 'active',
      weight_grams: 500,
      is_package: false,
      ...base,
    }));
    await queryInterface.bulkInsert('products', products);

    // --- product images -----------------------------------------------------
    await queryInterface.bulkInsert(
      'product_images',
      products.map((p, i) => ({
        id: uuidv4(),
        product_id: p.id,
        url: `https://cdn.subh.example.sa/demo/${p.sku}.jpg`,
        alt_text_ar: p.name_ar,
        sort_order: 0,
        is_primary: i === 0,
        ...base,
      })),
    );

    // --- package ------------------------------------------------------------
    const pkg = {
      id: uuidv4(),
      sku: 'DEMO-BUNDLE-001',
      slug: 'demo-bundle-001',
      name_ar: 'باقة تجريبية: جوال + شاحن',
      description_ar: 'باقة تجريبية لأغراض التحقق',
      price_sar: 2050,
      vat_rate: 0.15,
      status: 'active',
      ...base,
    };
    await queryInterface.bulkInsert('packages', [pkg]);
    await queryInterface.bulkInsert('package_items', [
      {
        package_id: pkg.id,
        product_id: products[0].id,
        quantity: 1,
        ...base,
      },
      {
        package_id: pkg.id,
        product_id: products[2].id,
        quantity: 1,
        ...base,
      },
    ]);

    // --- merchant (linked to the seeded merchant user) ---------------------
    const [[merchantUser]] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'merchant@subh.example.sa';",
    );
    const merchant = {
      id: uuidv4(),
      user_id: merchantUser.id,
      status: 'active',
      commercial_name: 'متجر صبح التجريبي',
      commercial_registration_no: '1010000000',
      vat_number: '300000000000003',
      iban: 'SA0000000000000000000000',
      commission_rate: 0.1,
      rating_avg: 4.5,
      rating_count: 12,
      approved_at: now,
      ...base,
    };
    await queryInterface.bulkInsert('merchants', [merchant]);

    // --- merchant_products: merchant is allowed to sell these --------------
    await queryInterface.bulkInsert('merchant_products', [
      { id: uuidv4(), merchant_id: merchant.id, product_id: products[0].id, is_active: true, ...base },
      { id: uuidv4(), merchant_id: merchant.id, product_id: products[1].id, is_active: true, ...base },
      { id: uuidv4(), merchant_id: merchant.id, package_id: pkg.id, is_active: true, ...base },
    ]);

    // --- inventory (central warehouse, one row per sellable) ---------------
    const inventory = [
      { sellable_type: 'product', sellable_id: products[0].id, sku: products[0].sku, on_hand: 50 },
      { sellable_type: 'product', sellable_id: products[1].id, sku: products[1].sku, on_hand: 30 },
      { sellable_type: 'product', sellable_id: products[2].id, sku: products[2].sku, on_hand: 100 },
      { sellable_type: 'package', sellable_id: pkg.id, sku: pkg.sku, on_hand: 15 },
    ].map((i) => ({
      id: uuidv4(),
      ...i,
      reserved: 0,
      reorder_threshold: 5,
      ...base,
    }));
    await queryInterface.bulkInsert('inventory', inventory);

    // --- plan + subscription -----------------------------------------------
    const plan = {
      id: uuidv4(),
      slug: 'basic-monthly',
      name_ar: 'الباقة الشهرية الأساسية',
      billing_period: 'monthly',
      price_sar: 99,
      is_active: true,
      features: JSON.stringify({ maxProducts: 100, commissionRate: 0.1 }),
      ...base,
    };
    await queryInterface.bulkInsert('plans', [plan]);
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await queryInterface.bulkInsert('merchant_subscriptions', [
      {
        id: uuidv4(),
        merchant_id: merchant.id,
        plan_id: plan.id,
        status: 'active',
        started_at: now,
        current_period_end: periodEnd,
        external_reference: null,
        ...base,
      },
    ]);
  },

  async down(queryInterface) {
    const order = [
      'merchant_subscriptions',
      'plans',
      'inventory',
      'merchant_products',
      'package_items',
      'packages',
      'product_images',
      'products',
      'categories',
    ];
    for (const t of order) {
      await queryInterface.bulkDelete(t, null, {});
    }
  },
};
