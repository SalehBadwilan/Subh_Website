/**
 * Seed the Stage 3 admin additions: settings + the demo admin_employee row.
 *
 * Idempotent — safe to re-run. Only inserts rows that do not already exist.
 *
 * Run: node scripts/seed-stage3.js
 */
import { bootApp } from '../src/app.js';

const now = new Date();

async function main() {
  console.log('Booting app...');
  const { models } = await bootApp();
  const { Setting, AdminEmployee, User, UserRole, Role } = models;

  // --- Settings seed -------------------------------------------------------
  const defaultSettings = [
    { key: 'platform.commission_default', label_ar: 'نسبة العمولة الافتراضية', value: { rate: 0.05 }, group: 'finance' },
    { key: 'platform.currency', label_ar: 'العملة الافتراضية', value: 'SAR', group: 'general' },
    { key: 'platform.support_phone', label_ar: 'هاتف الدعم', value: '+966920000000', group: 'general' },
    { key: 'platform.feature.ai_search', label_ar: 'تفعيل البحث الذكي', value: true, group: 'features' },
    { key: 'platform.orders.low_stock_threshold', label_ar: 'حد التنبيه لانخفاض المخزون', value: 5, group: 'inventory' },
  ];

  let settingsUpserted = 0;
  for (const s of defaultSettings) {
    const [row, created] = await Setting.findOrCreate({
      where: { key: s.key },
      defaults: s,
    });
    if (created) settingsUpserted += 1;
  }
  const totalSettings = await Setting.count();
  console.log(`✓ Settings: ${settingsUpserted} new, ${totalSettings} total.`);

  // --- Demo admin_employee user + role + AdminEmployee row -----------------
  // Find the user with the admin_employee role (seeded by rbac-demo).
  const adminEmployeeRole = await Role.findOne({ where: { slug: 'admin_employee' } });
  if (!adminEmployeeRole) {
    console.log('! admin_employee role not found — skipping demo admin employee.');
  } else {
    const existingUserRole = await UserRole.findOne({
      where: { role_id: adminEmployeeRole.id },
    });

    let user;
    if (existingUserRole) {
      user = await User.findByPk(existingUserRole.user_id);
      console.log(`✓ Found existing admin_employee user: ${user?.email || '(missing)'}`);
    } else {
      // Bootstrap one for environments where rbac-demo did not run / was
      // rolled back. Use a deterministic phone so OTP login is reproducible.
      user = await User.create({
        email: 'admin_employee@subh.example.sa',
        phone: '+966500000005',
        full_name: 'موظف إدارة تجريبي (قراءة فقط)',
        password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        is_active: true,
        is_guest: false,
      });
      await UserRole.create({ user_id: user.id, role_id: adminEmployeeRole.id, merchant_id: null });
      console.log(`✓ Created demo admin_employee user: ${user.email}`);
    }

    if (user) {
      const [ae, created] = await AdminEmployee.findOrCreate({
        where: { user_id: user.id },
        defaults: {
          user_id: user.id,
          department: 'catalog',
          role: 'admin_staff',
          is_active: true,
        },
      });
      if (created) {
        console.log('✓ Created AdminEmployee row (catalog / admin_staff).');
      } else {
        console.log('✓ AdminEmployee row already exists.');
      }
    }
  }

  await Setting.sequelize.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
