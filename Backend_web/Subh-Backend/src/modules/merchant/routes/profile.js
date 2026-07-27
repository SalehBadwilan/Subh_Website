/**
 * GET /api/merchant/profile
 *
 * Returns the merchant's commercial profile + the owning user's public fields.
 * Sensitive fields (iban fully, password_hash, internal flags) are masked /
 * stripped by the serializers.
 */
import { Router } from 'express';

import asyncHandler from '../../../utils/asyncHandler.js';
import { serializeMerchant } from '../utils/serializers.js';

export default function createProfileRoutes() {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const m = req.merchantModels;
      const { User } = m;
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'full_name', 'phone', 'email', 'is_active', 'email_verified_at', 'created_at'],
      });

      res.json({
        ok: true,
        data: {
          merchant: serializeMerchant(req.merchant),
          user: user
            ? {
                id: user.id,
                full_name: user.full_name,
                phone: user.phone,
                email: user.email,
                is_active: user.is_active,
                email_verified_at: user.email_verified_at,
              }
            : null,
        },
      });
    }),
  );

  return router;
}
