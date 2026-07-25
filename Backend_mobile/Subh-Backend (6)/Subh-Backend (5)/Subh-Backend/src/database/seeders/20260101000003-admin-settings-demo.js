'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seed: Stage 3 — admin platform settings (demo defaults).
 *
 * Each row is a JSONB key/value pair. Only non-secret, configuration-style
 * data lives here. Real secrets (JWT secret, AI key, DB credentials) remain
 * strictly in the environment, never in this table.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const base = { created_at: now, updated_at: now };

    const settings = [
      {
        key: 'platform.commission_default',
        label_ar: 'نسبة العمولة الافتراضية',
        value: { rate: 0.05 },
        group: 'finance',
      },
      {
        key: 'platform.currency',
        label_ar: 'العملة الافتراضية',
        value: 'SAR',
        group: 'general',
      },
      {
        key: 'platform.support_phone',
        label_ar: 'هاتف الدعم',
        value: '+966920000000',
        group: 'general',
      },
      {
        key: 'platform.feature.ai_search',
        label_ar: 'تفعيل البحث الذكي',
        value: true,
        group: 'features',
      },
      {
        key: 'platform.orders.low_stock_threshold',
        label_ar: 'حد التنبيه لانخفاض المخزون',
        value: 5,
        group: 'inventory',
      },
    ].map((s) => ({ id: uuidv4(), ...s, ...base }));

    await queryInterface.bulkInsert('settings', settings);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('settings', null, {});
  },
};
