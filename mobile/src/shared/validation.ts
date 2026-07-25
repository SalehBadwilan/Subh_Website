/**
 * التحقق من رقم الجوال السعودي — نفس منطق شاشة الدخول في الويب
 * (login.tsx): 9 أرقام تبدأ بـ 5، وتُخزَّن بصيغة ‎+9665XXXXXXXX.
 */

/** يزيل كل ما ليس رقمًا ويقتطع إلى 9 خانات (5XXXXXXXX) */
export function cleanSaudiMobile(input: string): string {
  return input.replace(/\D/g, "").slice(0, 9);
}

/** هل الرقم جوال سعودي صحيح؟ (يبدأ بـ 5 ويتكوّن من 9 أرقام) */
export function isValidSaudiMobile(digits: string): boolean {
  return /^5\d{8}$/.test(digits);
}

/** الصيغة الدولية الموحّدة المخزّنة في الجلسة */
export function toInternationalSaudi(digits: string): string {
  return `+966${digits}`;
}

/** رسالة الخطأ الموحّدة (نفس نص الويب) */
export const SAUDI_MOBILE_ERROR =
  "يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 5 ويتكون من 9 أرقام.";
