import { APP_CONFIG } from '../constants/config';
import type { CartItem } from '../types/cart';

/** تنسيق مبلغ بالريال السعودي. 99.0 → "٩٩٫٠٠ ر.س" (أرقام لاتينية افتراضياً للوضوح). */
export function formatSAR(amount: number, options?: { arabicNumerals?: boolean }): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const withSymbol = `${formatted} ${APP_CONFIG.currencySymbol}`;
  if (options?.arabicNumerals) {
    const arabicMap = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return withSymbol.replace(/[0-9]/g, (d) => arabicMap[Number(d)] ?? d);
  }
  return withSymbol;
}

/** تنسيق رقم بدون رمز العملة. */
export function formatNumber(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** حساب ضريبة القيمة المضافة (15% افتراضياً). */
export function calcTax(subtotal: number, rate: number = APP_CONFIG.taxRate): number {
  return Math.round(subtotal * rate * 100) / 100;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

/** حساب إجماليات الطلب من عناصر السلة + الشحن. */
export function calcOrderTotal(
  items: Pick<CartItem, 'lineTotal'>[],
  shippingCost: number,
  taxRate: number = APP_CONFIG.taxRate,
): OrderTotals {
  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const tax = calcTax(subtotal, taxRate);
  const total = round2(subtotal + shippingCost + tax);
  return { subtotal, shipping: round2(shippingCost), tax, total };
}

/** تقريب لمcentين (منع أخطاء الفاصلة العائمة). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** نسبة الخصم بين سعرين. */
export function discountPercent(price: number, compareAtPrice: number): number {
  if (compareAtPrice <= 0 || price >= compareAtPrice) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
