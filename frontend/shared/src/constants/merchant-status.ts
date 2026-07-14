import type { MerchantStatus } from '../types/merchant';

export const MERCHANT_STATUS_LABELS: Record<MerchantStatus, string> = {
  pending: 'قيد المراجعة',
  active: 'نشط',
  suspended: 'موقوف',
};

export const MERCHANT_STATUS_TONE: Record<MerchantStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  active: 'success',
  suspended: 'danger',
};
