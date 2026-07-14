/**
 * مغلفات استجابة API المشتركة لكل المنصة.
 * كل الدوال في `api/` تُرجع `ApiResult<T>` أو تُلقي `ApiError`.
 */

export interface ApiResult<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ApiError {
  /** رمز برمجي ثابت، يُترجَم لعربي في الواجهة. مثال: 'AUTH_INVALID_OTP' */
  code: string;
  /** رسالة عربية مفهومة للمستخدم. */
  message: string;
  /** الحقل المعني إن كان الخطأ متعلقاً بنموذج. */
  field?: string;
  /** تفاصيل إضافية اختيارية. */
  details?: Record<string, unknown>;
}

/** رموز الأخطاء المعروفة — تُستخدم لمطابقة آمنة بدل السلاسل الحرفية. */
export const API_ERROR_CODES = {
  AUTH_INVALID_PHONE: 'AUTH_INVALID_PHONE',
  AUTH_INVALID_OTP: 'AUTH_INVALID_OTP',
  AUTH_EXPIRED_ATTEMPT: 'AUTH_EXPIRED_ATTEMPT',
  AUTH_TOO_MANY_ATTEMPTS: 'AUTH_TOO_MANY_ATTEMPTS',
  AUTH_INVALID_REFRESH: 'AUTH_INVALID_REFRESH',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  CART_INVALID_QUANTITY: 'CART_INVALID_QUANTITY',
  STOCK_INSUFFICIENT: 'STOCK_INSUFFICIENT',
  CART_CHANGED: 'CART_CHANGED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  UPLOAD_INVALID_TYPE: 'UPLOAD_INVALID_TYPE',
  UPLOAD_TOO_LARGE: 'UPLOAD_TOO_LARGE',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** خيارات الطلب غير الآمن (POST/PUT/PATCH/DELETE) — لدعم idempotency. */
export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}
