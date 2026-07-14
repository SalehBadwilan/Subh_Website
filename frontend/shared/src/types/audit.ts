import type { Role } from './user';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  /** الكيان المتأثر (مثل 'merchant:123'). */
  target?: string;
  /** لقطة للتغييرات (قبل/بعد). */
  diff?: Record<string, { from: unknown; to: unknown }>;
  ip?: string;
  at: string;
}
