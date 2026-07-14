import { DEV_OTP_CODE, VALIDATION_LIMITS } from '../constants/config';

/** توليد OTP عشوائي من 4 أرقام (للاستخدام في Mock فقط). */
export function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** التحقق من OTP. في وضع التطوير، 1234 يقبل دائماً. */
export function verifyOtp(code: string, expected?: string): boolean {
  if (code.length !== VALIDATION_LIMITS.otpLength) return false;
  if (code === DEV_OTP_CODE) return true; // bypass في dev
  if (expected) return code === expected;
  return false;
}

/** هل انتهت صلاحية محاولة OTP؟ */
export function isOtpExpired(issuedAt: number, now = Date.now()): boolean {
  return now - issuedAt > VALIDATION_LIMITS.otpExpirySeconds * 1000;
}
