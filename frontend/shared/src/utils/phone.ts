/** صيغة الجوال السعودي: تقبل 05xxxxxxxx / 5xxxxxxxx / +9665xxxxxxxx / 9665xxxxxxxx. */
const SA_MOBILE = /^(?:\+?966|0)?(5\d{8})$/;

/** هل النص جوال سعودي صحيح؟ */
export function isValidSaudiPhone(input: string): boolean {
  return SA_MOBILE.test(input.replace(/[\s-]/g, ''));
}

/**
 * يوحّد كل صيغ الجوال السعودي إلى +9665xxxxxxxx.
 * يعود null إن كان الإدخال غير صالح.
 */
export function normalizeSaudiPhone(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, '');
  const match = cleaned.match(SA_MOBILE);
  if (!match) return null;
  return `+966${match[1]}`;
}

/** يحجي أرقام الجوال للعرض: +966 50 ***4567. */
export function maskPhone(phone: string): string {
  const normalized = normalizeSaudiPhone(phone);
  if (!normalized) return phone;
  // +9665xxxxxxxx → +966 5x ***xxxx
  const last4 = normalized.slice(-4);
  const prefix = normalized.slice(0, 6); // +9665x
  return `${prefix} ***${last4}`;
}

/** يفصل رمز الدولة عن الرقم المحلي للعرض في حقل الإدخال. */
export function splitSaudiPhone(phone: string): { countryCode: string; local: string } {
  const normalized = normalizeSaudiPhone(phone);
  if (!normalized) return { countryCode: '+966', local: '' };
  return { countryCode: '+966', local: normalized.slice(4) }; // بعد +966
}

/** zod-style validator string للرسائل. */
export const PHONE_ERROR_MESSAGE = 'رقم الجوال غير صحيح. مثال: 05xxxxxxxx';
