import { describe, it, expect } from 'vitest';
import { isValidSaudiPhone, normalizeSaudiPhone, maskPhone } from '../phone';

describe('phone utils', () => {
  it('يقبل صيغ الجوال السعودي المختلفة', () => {
    expect(isValidSaudiPhone('0512345678')).toBe(true);
    expect(isValidSaudiPhone('512345678')).toBe(true);
    expect(isValidSaudiPhone('+966512345678')).toBe(true);
    expect(isValidSaudiPhone('966512345678')).toBe(true);
    expect(isValidSaudiPhone('0512345678')).toBe(true);
  });

  it('يرفض الأرقام غير السعودية', () => {
    expect(isValidSaudiPhone('0212345678')).toBe(false); // ثابت
    expect(isValidSaudiPhone('12345')).toBe(false);
    expect(isValidSaudiPhone('+96641234567')).toBe(false); // يبدأ بـ 4
  });

  it('يوحّد كل الصيغ إلى +9665xxxxxxxx', () => {
    expect(normalizeSaudiPhone('0512345678')).toBe('+966512345678');
    expect(normalizeSaudiPhone('512345678')).toBe('+966512345678');
    expect(normalizeSaudiPhone('+966512345678')).toBe('+966512345678');
    expect(normalizeSaudiPhone('invalid')).toBeNull();
  });

  it('يحجي الرقم للعرض', () => {
    expect(maskPhone('0512345678')).toContain('***');
    expect(maskPhone('0512345678')).toContain('5678');
  });
});
