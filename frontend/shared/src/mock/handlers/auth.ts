import { getDb } from '../db';
import { generateOtp, verifyOtp, isOtpExpired } from '../../utils/otp';
import { normalizeSaudiPhone } from '../../utils/phone';
import { DEV_OTP_CODE, VALIDATION_LIMITS, API_ERROR_CODES } from '../../constants/config';
import type { AuthSession, User } from '../../types/user';
import type { ApiResult, ApiError } from '../../types/api';

function apiError(code: string, message: string, field?: string): ApiError {
  return { code, message, field };
}

export interface MockAuthHandler {
  requestOtp(phone: string): Promise<ApiResult<{ attemptId: string; expiresIn: number }>>;
  verifyOtp(attemptId: string, code: string): Promise<ApiResult<AuthSession>>;
  me(accessToken: string): Promise<ApiResult<User>>;
}

export function createMockAuthHandler(): MockAuthHandler {
  return {
    async requestOtp(phone) {
      const normalized = normalizeSaudiPhone(phone);
      if (!normalized) {
        throw apiError(API_ERROR_CODES.AUTH_INVALID_PHONE, 'رقم الجوال غير صحيح. مثال: 05xxxxxxxx', 'phone');
      }
      const db = getDb();
      const attemptId = `att_${Date.now()}`;
      const code = generateOtp();
      db.otpAttempts.set(attemptId, { phone: normalized, code, issuedAt: Date.now() });
      // في dev نطبع الكود (ولكن الواجهة تعرف أن 1234 يقبل دائماً).
      // eslint-disable-next-line no-console
      console.info(`[Mock] OTP لـ ${normalized}: ${code} (أو استخدم ${DEV_OTP_CODE} للدخول السريع)`);
      return { data: { attemptId, expiresIn: VALIDATION_LIMITS.otpExpirySeconds } };
    },

    async verifyOtp(attemptId, code) {
      const db = getDb();
      const attempt = db.otpAttempts.get(attemptId);
      if (!attempt || isOtpExpired(attempt.issuedAt)) {
        throw apiError(API_ERROR_CODES.AUTH_EXPIRED_ATTEMPT, 'انتهت صلاحية المحاولة. أعد طلب الرمز.');
      }
      if (!verifyOtp(code, attempt.code)) {
        throw apiError(API_ERROR_CODES.AUTH_INVALID_OTP, 'رمز التحقق غير صحيح.', 'code');
      }
      // أوجد/أنشئ مستخدم بالجوال.
      let user = db.users.find((u) => u.phone === attempt.phone);
      if (!user) {
        user = {
          id: `u_${Date.now()}`,
          phone: attempt.phone,
          role: 'customer',
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
      }
      const session: AuthSession = {
        user,
        accessToken: `mock_token_${user.id}_${Date.now()}`,
        refreshToken: `mock_refresh_${user.id}`,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      };
      db.otpAttempts.delete(attemptId);
      return { data: session };
    },

    async me(accessToken) {
      const db = getDb();
      const userId = accessToken.split('_')[2];
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        throw apiError(API_ERROR_CODES.AUTH_UNAUTHORIZED, 'جلسة غير صالحة.');
      }
      return { data: user };
    },
  };
}
