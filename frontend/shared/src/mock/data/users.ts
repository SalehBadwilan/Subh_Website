import type { User } from '../../types/user';

export const mockUsers: User[] = [
  {
    id: 'u1',
    phone: '+966500000001',
    name: 'عميل تجريبي',
    role: 'customer',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'u2',
    phone: '+966500000002',
    name: 'تاجر الأفق',
    role: 'merchant',
    merchantId: 'm1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u3',
    phone: '+966500000003',
    name: 'مدير المنصة',
    role: 'admin',
    createdAt: '2025-12-01T00:00:00Z',
  },
];
