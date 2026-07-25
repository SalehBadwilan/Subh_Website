'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seed: RBAC foundation (roles, permissions, demo users per role).
 * All seed rows are clearly demo (email domain @subh.example.sa).
 *
 * Password hash below is for "Subh@Demo1234" — demo only, not a real secret.
 */
const DEMO_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // Subh@Demo1234

const ROLES = [
  { slug: 'customer', name_ar: 'عميل', scope: 'global' },
  { slug: 'merchant', name_ar: 'تاجر', scope: 'global' },
  { slug: 'merchant_employee', name_ar: 'موظف تاجر', scope: 'merchant' },
  { slug: 'admin', name_ar: 'إدارة', scope: 'global' },
  { slug: 'admin_employee', name_ar: 'موظف إدارة', scope: 'global' },
  { slug: 'warehouse', name_ar: 'موظف مستودع', scope: 'global' },
];

const PERMISSIONS = [
  { slug: 'catalog:read', name_ar: 'عرض الكتالوج' },
  { slug: 'catalog:write', name_ar: 'تعديل الكتالوج' },
  { slug: 'inventory:read', name_ar: 'عرض المخزون' },
  { slug: 'inventory:adjust', name_ar: 'تعديل المخزون' },
  { slug: 'orders:read', name_ar: 'عرض الطلبات' },
  { slug: 'orders:write', name_ar: 'تعديل الطلبات' },
  { slug: 'payments:read', name_ar: 'عرض المدفوعات' },
  { slug: 'payments:capture', name_ar: 'قبض المدفوعات' },
  { slug: 'merchants:read', name_ar: 'عرض التجار' },
  { slug: 'merchants:approve', name_ar: 'اعتماد التجار' },
  { slug: 'reports:read', name_ar: 'عرض التقارير' },
  { slug: 'fulfillment:write', name_ar: 'تحديث الشحن' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const base = { created_at: now, updated_at: now };

    const roles = ROLES.map((r) => ({ id: uuidv4(), ...r, ...base }));
    await queryInterface.bulkInsert('roles', roles);

    const permissions = PERMISSIONS.map((p) => ({
      id: uuidv4(),
      ...p,
      description_ar: null,
      ...base,
    }));
    await queryInterface.bulkInsert('permissions', permissions);

    const rolePerms = [];
    const grant = (roleSlug, permSlugs) => {
      const role = roles.find((r) => r.slug === roleSlug);
      permSlugs.forEach((permSlug) => {
        const perm = permissions.find((p) => p.slug === permSlug);
        rolePerms.push({ role_id: role.id, permission_id: perm.id, ...base });
      });
    };
    grant('customer', ['catalog:read', 'orders:read']);
    grant('merchant', ['catalog:read', 'orders:read', 'merchants:read', 'reports:read']);
    grant('merchant_employee', ['catalog:read', 'orders:read']);
    grant('admin', PERMISSIONS.map((p) => p.slug));
    grant('admin_employee', ['catalog:read', 'orders:read', 'reports:read']);
    grant('warehouse', ['inventory:read', 'inventory:adjust', 'fulfillment:write', 'orders:read']);
    await queryInterface.bulkInsert('role_permissions', rolePerms);

    const users = [
      {
        email: 'customer@subh.example.sa',
        phone: '+966500000001',
        full_name: 'عميل تجريبي',
        roleSlug: 'customer',
      },
      {
        email: 'merchant@subh.example.sa',
        phone: '+966500000002',
        full_name: 'تاجر تجريبي',
        roleSlug: 'merchant',
      },
      {
        email: 'admin@subh.example.sa',
        phone: '+966500000003',
        full_name: 'مدير النظام التجريبي',
        roleSlug: 'admin',
      },
      {
        email: 'admin_employee@subh.example.sa',
        phone: '+966500000005',
        full_name: 'موظف إدارة تجريبي (قراءة فقط)',
        roleSlug: 'admin_employee',
      },
      {
        email: 'warehouse@subh.example.sa',
        phone: '+966500000004',
        full_name: 'موظف مستودع تجريبي',
        roleSlug: 'warehouse',
      },
    ].map((u) => ({ id: uuidv4(), ...u }));

    await queryInterface.bulkInsert(
      'users',
      users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        password_hash: DEMO_PASSWORD_HASH,
        full_name: u.full_name,
        is_active: true,
        is_guest: false,
        email_verified_at: now,
        ...base,
      })),
    );

    const userRoles = users.map((u) => {
      const role = roles.find((r) => r.slug === u.roleSlug);
      return { id: uuidv4(), user_id: u.id, role_id: role.id, merchant_id: null, ...base };
    });
    await queryInterface.bulkInsert('user_roles', userRoles);

    // Seed an AdminEmployee row for the demo admin_employee user so the
    // requireAdmin middleware (which gates on an active AdminEmployee record
    // for the read-only role) grants read access out of the box.
    const adminEmployeeUser = users.find((u) => u.roleSlug === 'admin_employee');
    if (adminEmployeeUser) {
      await queryInterface.bulkInsert('admin_employees', [
        {
          id: uuidv4(),
          user_id: adminEmployeeUser.id,
          department: 'catalog',
          role: 'admin_staff',
          is_active: true,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
