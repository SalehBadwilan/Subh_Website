import type { Permission } from './staff';

/** أدوار المنصة الستة. مصدر الصلاحيات في `constants/permissions.ts`. */
export type Role =
  | 'customer'
  | 'merchant'
  | 'merchant_staff'
  | 'ops_staff'
  | 'admin'
  | 'admin_staff';

export interface User {
  id: string;
  /** جوال سعودي موحّد بالصيغة +9665xxxxxxxx */
  phone: string;
  name?: string;
  email?: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
  /** للتاجر/موظف التاجر — معرّف الكيان التجاري. */
  merchantId?: string;
  /** لموظفي التاجر/الإدارة — صلاحياتهم الفعلية. */
  permissions?: Permission[];
}

export interface AuthSession {
  user: User;
  accessToken: string;
  /** للويب: httpOnly cookie. للموبايل: SecureStore. */
  refreshToken?: string;
  expiresAt: string;
}
