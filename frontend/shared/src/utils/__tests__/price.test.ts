import { describe, it, expect } from 'vitest';
import { formatSAR, calcTax, calcOrderTotal, round2, discountPercent } from '../price';

describe('price utils', () => {
  it('ينسق المبلغ بالريال السعودي', () => {
    expect(formatSAR(149)).toBe('149.00 ر.س');
    expect(formatSAR(0)).toBe('0.00 ر.س');
    expect(formatSAR(196.35)).toBe('196.35 ر.س');
  });

  it('يحوّل الأرقام لعربية عند الطلب', () => {
    expect(formatSAR(149, { arabicNumerals: true })).toContain('١٤٩');
  });

  it('يحسب الضريبة 15%', () => {
    expect(calcTax(100)).toBe(15);
    expect(calcTax(149)).toBe(22.35);
    expect(calcTax(100, 0.1)).toBe(10); // معدل مخصص
  });

  it('يحسب إجماليات الطلب', () => {
    const items = [{ lineTotal: 100 }, { lineTotal: 50 }];
    const totals = calcOrderTotal(items, 25);
    expect(totals.subtotal).toBe(150);
    expect(totals.shipping).toBe(25);
    expect(totals.tax).toBe(22.5); // 15% من 150
    expect(totals.total).toBe(197.5);
  });

  it('يقرب لcentين', () => {
    // ملاحظة: 10.155 قد تمثل كـ 10.15499... في الفاصلة العائمة، لذا نختبر قيماً واضحة.
    expect(round2(10.156)).toBe(10.16);
    expect(round2(10.154)).toBe(10.15);
    expect(round2(149.0)).toBe(149);
  });

  it('يحسب نسبة الخصم', () => {
    expect(discountPercent(149, 199)).toBe(25); // ~25%
    expect(discountPercent(100, 100)).toBe(0);
    expect(discountPercent(150, 100)).toBe(0); // لا خصم إن زاد السعر
  });
});
