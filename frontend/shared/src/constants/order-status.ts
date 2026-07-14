import { OrderStatus } from '../types/order';

/** ترجمة عربية لكل حالة طلب — تُعرض في الواجهة مباشرة. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.RECEIVED]: 'تم الاستلام',
  [OrderStatus.PROCESSING]: 'قيد التجهيز',
  [OrderStatus.SHIPPED]: 'شُحن',
  [OrderStatus.OUT_FOR_DELIVERY]: 'خرج للتسليم',
  [OrderStatus.DELIVERED]: 'تم التسليم',
  [OrderStatus.CANCELLED]: 'أُلغي',
};

/** التسلسل الزمني للحالات لعرضه في OrderTimeline. CANCELLED فرع منفصل. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.RECEIVED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

/** ألوان الحالات (token names — تُترجم في الطبقة البصرية). */
export const ORDER_STATUS_TONE: Record<OrderStatus, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  [OrderStatus.RECEIVED]: 'info',
  [OrderStatus.PROCESSING]: 'warning',
  [OrderStatus.SHIPPED]: 'info',
  [OrderStatus.OUT_FOR_DELIVERY]: 'info',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.CANCELLED]: 'danger',
};

/** هل الحالة نهائية (لا رجعة بعدها)؟ */
export const isFinalStatus = (status: OrderStatus): boolean =>
  status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;

/** هل يمكن للعميل إلغاء الطلب في هذه الحالة؟ */
export const isCancellable = (status: OrderStatus): boolean =>
  status === OrderStatus.RECEIVED || status === OrderStatus.PROCESSING;
