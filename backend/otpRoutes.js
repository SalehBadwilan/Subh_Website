/**
 * Auth routes — phone OTP login.
 *
 *   POST /api/auth/otp/request   issues a 6-digit OTP (devOtp returned in dev)
 *   POST /api/auth/otp/verify    verifies the OTP, creates/fetches the user,
 *                                returns a JWT + safe user fields.
 *
 * SMS provider is intentionally NOT wired yet; in development the raw code is
 * returned as devOtp for testing.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import asyncHandler from '../../utils/asyncHandler.js';
import { ApiError, badRequest } from '../../utils/ApiError.js';
import validate from '../../middleware/validate.js';
import env from '../../config/env.js';
import {
  issueOtp,
  verifyOtp,
  normalizePhone,
  isValidPhone,
} from '../../services/otpService.js';
import { signUserToken } from '../../utils/jwt.js';

export default function createOtpRoutes({ models }) {
  const router = Router();
  const { OtpCode, User } = models;

  /**
   * Select only safe, non-sensitive fields to return to the client.
   * password_hash is NEVER included.
   */
  const safeUser = (u) => ({
    id: u.id,
    phone: u.phone,
    email: u.email,
    full_name: u.full_name,
    is_active: u.is_active,
    is_guest: u.is_guest,
    email_verified_at: u.email_verified_at,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
  });

  // --- POST /api/auth/otp/request -------------------------------------------
  router.post(
    '/request',
    [
      body('phone')
        .exists({ checkFalsy: true })
        .withMessage('phone مطلوب')
        .custom((v) => isValidPhone(normalizePhone(v)))
        .withMessage('رقم الجوال غير صالح'),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { code, expiresAt, phone } = await issueOtp({ OtpCode, phone: req.body.phone });

      const response = {
        ok: true,
        message: 'تم إرسال رمز التحقق بنجاح',
        data: {
          phone,
          expires_in_seconds: Math.max(0, Math.round((expiresAt - Date.now()) / 1000)),
        },
      };

      // Return the raw code ONLY in development so tests can verify the flow.
      if (!env.isProd) {
        response.data.devOtp = code;
      }

      return res.status(200).json(response);
    }),
  );

  // --- POST /api/auth/otp/verify --------------------------------------------
  router.post(
    '/verify',
    [
      body('phone')
        .exists({ checkFalsy: true })
        .withMessage('phone مطلوب')
        .custom((v) => isValidPhone(normalizePhone(v)))
        .withMessage('رقم الجوال غير صالح'),
      body('otp')
        .exists({ checkFalsy: true })
        .withMessage('otp مطلوب')
        .isString()
        .matches(/^\d{6}$/)
        .withMessage('رمز التحقق يجب أن يكون 6 أرقام'),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { phone, otp } = req.body;

      // Throws on wrong/expired/used code.
      await verifyOtp({ OtpCode, phone, code: otp });

      const normalized = normalizePhone(phone);

      // Find or create the user by phone.
      let user = await User.findOne({ where: { phone: normalized } });
      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        // users table requires email, password_hash, full_name (NOT NULL).
        // Generate deterministic placeholders so the row is valid without an
        // explicit signup. Password is random and unused (login is OTP-based).
        const randomSecret = crypto.randomBytes(24).toString('hex');
        user = await User.create({
          phone: normalized,
          email: `${normalized}@phone.subh.local`,
          password_hash: bcrypt.hashSync(randomSecret, 10),
          full_name: 'مستخدم جديد',
          is_active: true,
          is_guest: false,
        });
      }

      // Block inactive accounts from logging in.
      if (!user.is_active) {
        throw new ApiError(403, 'هذا الحساب غير نشط، يرجى التواصل مع الدعم');
      }

      // Stamp last login.
      await user.update({ last_login_at: new Date() });

      const { token, expiresIn } = signUserToken(user);

      return res.status(200).json({
        ok: true,
        message: isNewUser ? 'تم إنشاء الحساب وتسجيل الدخول' : 'تم تسجيل الدخول بنجاح',
        data: {
          user: safeUser(user),
          token,
          token_expires_in: expiresIn,
        },
      });
    }),
  );

  return router;
}
