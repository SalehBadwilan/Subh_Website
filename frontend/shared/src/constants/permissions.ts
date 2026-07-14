import type { Role } from '../types/user';
import type { Permission } from '../types/staff';

/**
 * مصفوفة الصلاحيات الافتراضية لكل دور.
 * ⚠️ مبدئية بانتظار اعتماد العميل (سؤال 9 في docs/questions.md).
 * المبدأ: أقل صلاحية افتراضياً — الموظف يأخذ ما يُمنح صراحةً.
 */
export const ALL_PERMISSIONS: Permission[] = [
  'products.view',
  'products.manage',
  'orders.view',
  'orders.manage',
  'returns.view',
  'returns.manage',
  'finance.view',
  'finance.manage',
  'reports.view',
  'staff.manage',
  'settings.manage',
];

export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  customer: [],
  merchant: [...ALL_PERMISSIONS],
  // موظف التاجر: عرض فقط افتراضياً — المالية والتقارير محجوبة (سيناريو 8).
  merchant_staff: ['products.view', 'orders.view', 'returns.view'],
  ops_staff: ['orders.view', 'orders.manage', 'products.view'],
  admin: [...ALL_PERMISSIONS],
  // موظف الإدارة: عرض + إدارة طلبات/منتجات، بدون مالية.
  admin_staff: ['products.view', 'products.manage', 'orders.view', 'orders.manage', 'returns.view'],
};

/** التحقق من صلاحية مستخدم. يأخذ permissions الصريحة إن وُجدت. */
export const hasPermission = (
  role: Role,
  permission: Permission,
  explicit?: Permission[],
): boolean => {
  if (explicit) return explicit.includes(permission);
  return DEFAULT_PERMISSIONS[role].includes(permission);
};
