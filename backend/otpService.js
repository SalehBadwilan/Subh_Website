/**
 * OTP service — phone validation, code generation, hashing, and verification.
 *
 * Storage rules:
 *  - Only code_hash (SHA-256) is persisted. The raw code is returned to the
 *    caller ONLY in development (devOtp) for testing.
 *  - TTL is OTP_TTL_MINUTES (default 5).
 *  - Issuing a new code revokes every prior UNUSED code for the same phone by
 *    pushing their expires_at into the past.
 *  - A successfully verified code is marked is_used = true.
 *
 * The crypto.randomInt() call gives a uniformly-distributed 6-digit code.
 */
import crypto from 'crypto';
import { Op } from 'sequelize';
import { ApiError, badRequest } from '../utils/ApiError.js';

// 6-digit numeric OTP.
const OTP_LENGTH = 6;
// Validity window in minutes.
export const OTP_TTL_MINUTES = 5;
// Max wrong attempts before the code is rejected outright.
const MAX_ATTEMPTS = 5;

// Saudi mobile phone: optional leading +966/00966 then 05, or just 05XXXXXXXX.
const PHONE_RE = /^(?:\+?966|0?0?966)?0?5\d{8}$/;

/**
 * Normalize a phone to a canonical local form 05XXXXXXXX when possible.
 * Otherwise return the trimmed input as-is so uniqueness is stable.
 */
export function normalizePhone(phone) {
  if (typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  // +9665XXXXXXXX / 9665XXXXXXXX -> 05XXXXXXXX
  if (/^9665\d{8}$/.test(digits)) return '0' + digits.slice(3);
  // 5XXXXXXXX -> 05XXXXXXXX
  if (/^5\d{8}$/.test(digits)) return '0' + digits;
  return trimmed;
}

export function isValidPhone(phone) {
  return typeof phone === 'string' && PHONE_RE.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Generate a cryptographically-random 6-digit code as a zero-padded string.
 */
export function generateOtp() {
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH); // [0, 1_000_000)
  return n.toString().padStart(OTP_LENGTH, '0');
}

export function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

/**
 * Issue a new OTP for a phone: revoke prior unused codes, then insert a new row.
 * Returns the raw code (dev only) and its expiry date.
 */
export async function issueOtp({ OtpCode, phone }) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) {
    throw badRequest('رقم الجوال غير صالح', { field: 'phone' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  // Revoke any earlier, still-unused codes for this phone by expiring them.
  await OtpCode.update(
    { expires_at: now },
    {
      where: {
        phone: normalized,
        is_used: false,
        expires_at: { [Op.gt]: now },
      },
    },
  );

  const code = generateOtp();
  await OtpCode.create({
    phone: normalized,
    code_hash: hashOtp(code),
    expires_at: expiresAt,
    is_used: false,
    attempts: 0,
  });

  return { code, expiresAt, phone: normalized };
}

/**
 * Verify a submitted OTP against the latest valid, unused code for the phone.
 * On success marks the code as used. Throws ApiError on any failure.
 */
export async function verifyOtp({ OtpCode, phone, code }) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) {
    throw badRequest('رقم الجوال غير صالح', { field: 'phone' });
  }
  if (!code || !/^\d{6}$/.test(String(code))) {
    throw badRequest('رمز التحقق غير صالح', { field: 'otp' });
  }

  const now = new Date();

  // Latest unused, non-expired code for this phone.
  const record = await OtpCode.findOne({
    where: {
      phone: normalized,
      is_used: false,
      expires_at: { [Op.gt]: now },
    },
    order: [['created_at', 'DESC']],
  });

  if (!record) {
    throw new ApiError(410, 'رمز التحقق غير موجود أو منتهي الصلاحية');
  }

  // Throttle brute force: bump attempts, reject after MAX_ATTEMPTS.
  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > MAX_ATTEMPTS) {
    record.is_used = true;
    await record.save();
    throw new ApiError(410, 'تجاوزت عدد المحاولات المسموحة، يرجى طلب رمز جديد');
  }
  await record.save();

  // Constant-time-ish comparison of hashes.
  if (record.code_hash !== hashOtp(code)) {
    throw new ApiError(401, 'رمز التحقق غير صحيح');
  }

  // Success: consume the code.
  record.is_used = true;
  await record.save();

  return { phone: normalized };
}
