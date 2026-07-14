import type { Merchant } from '../../types/merchant';

export const mockMerchants: Merchant[] = [
  { id: 'm1', name: 'متجر الأفق', status: 'active', crNumber: '1010101010', city: 'الرياض', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'm2', name: 'بيت الأناقة', status: 'active', crNumber: '2020202020', city: 'جدة', createdAt: '2026-02-01T00:00:00Z' },
  { id: 'm3', name: 'ركن الذواقة', status: 'active', crNumber: '3030303030', city: 'الدمام', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'm4', name: 'متجري الجديد', status: 'pending', crNumber: '4040404040', city: 'مكة', createdAt: '2026-06-01T00:00:00Z' },
];
