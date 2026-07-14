/** إعدادات عامة للمنصة. */

// إعادة تصدير رموز الأخطاء (معرّفة في types/api.ts) لتسهيل الاستيراد من مكان واحد.
export { API_ERROR_CODES } from '../types/api';
export type { ApiErrorCode } from '../types/api';

export const APP_CONFIG = {
  name: 'صبح',
  nameEn: 'Sabah',
  currency: 'SAR' as const,
  locale: 'ar-SA',
  /** نسبة ضريبة القيمة المضافة في السعودية. */
  taxRate: 0.15,
  /** عملة العرض. */
  currencySymbol: 'ر.س',
  /** بادئة أرقام الطلبات. */
  orderCodePrefix: 'SBH',
  supportPhone: '+966920000000',
  supportEmail: 'support@sabah.sa',
} as const;

/** مهلات الشبكة وإعادة المحاولة لـ HttpClient. */
export const HTTP_CONFIG = {
  timeoutMs: 15000,
  retries: 1,
  retryDelayMs: 500,
} as const;

/** حدود التحقق. */
export const VALIDATION_LIMITS = {
  otpLength: 4,
  otpExpirySeconds: 120,
  phoneMinLength: 9,
  phoneMaxLength: 15,
  passwordMinLength: 8,
  uploadMaxBytes: 5 * 1024 * 1024, // 5MB
  uploadAllowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  cartMaxItems: 50,
  cartMaxQuantityPerItem: 99,
} as const;

/** OTP ثابت في وضع التطوير (Mock). */
export const DEV_OTP_CODE = '1234';
