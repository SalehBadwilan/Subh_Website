/**
 * JWT helpers — sign and verify auth tokens.
 *
 * Secret and expiry come from env (src/config/env.js). We keep these wrappers
 * thin so route handlers stay declarative.
 */
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Sign a JWT for a given user payload.
 * @param {object} user - Sequelize User instance (must have id).
 * @returns {{ token: string, expiresIn: string }}
 */
export function signUserToken(user) {
  const payload = {
    sub: user.id,
    phone: user.phone,
    // `is_guest` kept for downstream authorization decisions.
    is_guest: user.is_guest,
  };
  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
  return { token, expiresIn: env.jwt.expiresIn };
}

/**
 * Verify a token. Throws on invalid/expired signatures (caller handles).
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyUserToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

export default { signUserToken, verifyUserToken };
