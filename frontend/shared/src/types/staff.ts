/** صلاحيات موظف التاجر/الإدارة. المصفوفة الكاملة في `constants/permissions.ts`. */
export type Permission =
  | 'products.view'
  | 'products.manage'
  | 'orders.view'
  | 'orders.manage'
  | 'returns.view'
  | 'returns.manage'
  | 'finance.view'
  | 'finance.manage'
  | 'reports.view'
  | 'staff.manage'
  | 'settings.manage';

export interface StaffMember {
  id: string;
  merchantId: string;
  name: string;
  phone: string;
  role: 'merchant_staff' | 'admin_staff';
  permissions: Permission[];
  active: boolean;
  createdAt: string;
}
