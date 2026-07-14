import type { ShippingMethod } from '../types/shipping';

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  standard: 'شحن عادي',
  express: 'شحن مستعجل',
  courier: 'ساعي خاص',
  pickup: 'استلام من المتجر',
};

/** الترتيب الافتراضي لعرض خيارات الشحن. */
export const SHIPPING_METHOD_ORDER: ShippingMethod[] = ['standard', 'express', 'courier', 'pickup'];
