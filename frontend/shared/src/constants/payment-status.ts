import type { PaymentStatus } from '../types/payment';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'بانتظار الدفع',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مُسترجع',
  partially_refunded: 'مسترجع جزئياً',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
  partially_refunded: 'warning',
};
