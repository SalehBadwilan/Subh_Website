import type { ShippingOption } from '../types/shipping';
import { SHIPPING_METHOD_ORDER } from '../constants/shipping-methods';

/** خيارات الشحن الافتراضية (Mock). قيم real تُجلب من /shipping/options. */
export const DEFAULT_SHIPPING_OPTIONS: ShippingOption[] = [
  { method: 'standard', label: 'شحن عادي', cost: 25, eta: { min: 3, max: 5 }, currency: 'SAR' },
  { method: 'express', label: 'شحن مستعجل', cost: 45, eta: { min: 1, max: 2 }, currency: 'SAR' },
  { method: 'courier', label: 'ساعي خاص', cost: 75, eta: { min: 1, max: 1 }, currency: 'SAR' },
  { method: 'pickup', label: 'استلام من المتجر', cost: 0, eta: { min: 0, max: 0 }, currency: 'SAR' },
];

/** ترتيب خيارات الشحن وفق التسلسل المعتمد. */
export function sortShippingOptions(options: ShippingOption[]): ShippingOption[] {
  return [...options].sort(
    (a, b) =>
      SHIPPING_METHOD_ORDER.indexOf(a.method) - SHIPPING_METHOD_ORDER.indexOf(b.method),
  );
}

/** خيار الشحن الأرخص. */
export function cheapestShipping(options: ShippingOption[]): ShippingOption | undefined {
  return options.reduce(
    (min, o) => (!min || o.cost < min.cost ? o : min),
    undefined as ShippingOption | undefined,
  );
}
