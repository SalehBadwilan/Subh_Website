/**
 * Authentication middleware.
 *
 * Verifies the Bearer JWT on `Authorization` and attaches the decoded user
 * payload to `req.user` ({ id, phone, is_guest }). Guest accounts are blocked
 * unless `allowGuest` is passed.
 *
 * This is intentionally thin: JWT sign/verify lives in utils/jwt.js, and the
 * customer-facing routes compose this with their own authorization checks
 * (e.g. scope every query by req.user.id).
 */
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyUserToken } from '../utils/jwt.js';

/**
 * Extract the bearer token from the Authorization header.
 * Accepts "Bearer <token>" (case-insensitive scheme).
 */
function extractBearer(header) {
  if (!header || typeof header !== 'string') return null;
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Authenticate a request. On success, `req.user` is populated with the decoded
 * JWT payload. Guest tokens are rejected unless `allowGuest` is true.
 *
 *   router.get('/me', authenticate, handler);
 */
export const authenticate = ({ allowGuest = false } = {}) =>
  asyncHandler(async (req, _res, next) => {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      throw new ApiError(401, 'المصادقة مطلوبة', { code: 'missing_token' });
    }

    let payload;
    try {
      payload = verifyUserToken(token);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      throw new ApiError(401, expired ? 'انتهت صلاحية الجلسة' : 'جلسة غير صالحة', {
        code: expired ? 'token_expired' : 'invalid_token',
      });
    }

    if (!payload || !payload.sub) {
      throw new ApiError(401, 'جلسة غير صالحة', { code: 'invalid_token' });
    }

    // Block guest (not-yet-registered) identities from protected routes.
    if (!allowGuest && payload.is_guest) {
      throw new ApiError(403, 'هذا الإجراء يتطلب حسابًا مسجلاً', { code: 'guest_not_allowed' });
    }

    req.user = { id: payload.sub, phone: payload.phone, is_guest: Boolean(payload.is_guest) };
    next();
  });

export default authenticate;
