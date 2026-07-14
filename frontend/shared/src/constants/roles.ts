import type { Role } from '../types/user';

export const ROLES: Role[] = [
  'customer',
  'merchant',
  'merchant_staff',
  'ops_staff',
  'admin',
  'admin_staff',
];

export const ROLE_LABELS: Record<Role, string> = {
  customer: 'عميل',
  merchant: 'تاجر',
  merchant_staff: 'موظف تاجر',
  ops_staff: 'موظف عمليات',
  admin: 'مدير',
  admin_staff: 'موظف إدارة',
};

/** الأدوار التي تملك صلاحية الوصول للوحة التاجر. */
export const MERCHANT_ROLES: Role[] = ['merchant', 'merchant_staff'];

/** الأدوار التي تملك صلاحية الوصول للوحة الإدارة. */
export const ADMIN_ROLES: Role[] = ['admin', 'admin_staff', 'ops_staff'];
