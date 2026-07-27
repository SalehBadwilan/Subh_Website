import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import asyncHandler from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../utils/paginate.js';
import validate from '../../middleware/validate.js';
import authenticate from '../../middleware/auth.js';
import { getUserRoles } from "../../utils/getUserRoles.js";
import {
  requireAdmin,
  requireFullAdmin,
} from "../../middleware/adminAuth.js";

export default function createUserRoutes({ models }) {
  const router = Router();
 const {
  User,
} = models;
  

  /**
   * Safe user projection — NEVER includes password_hash.
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

  // --- GET /api/users/me ----------------------------------------------------
  // Customer profile: the authenticated user reads their own record.
  // Registered BEFORE /:id so the literal "me" is not swallowed by :id.
  router.get(
    '/me',
    authenticate(),
    asyncHandler(async (req, res) => {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password_hash'] },
      });
      if (!user) throw notFound('User');
      res.json({ ok: true, data: safeUser(user) });
    }),
  );

  // --- PUT /api/users/me ----------------------------------------------------
  // Customer profile update. Only the profile fields a customer may edit:
  // full_name, email. Phone is managed via OTP flow, so it is NOT editable
  // here (avoids hijacking another user's phone without verification).
  router.put(
    '/me',
    authenticate(),
    [
      body('full_name').optional().isString().trim().isLength({ min: 1, max: 150 }),
      body('email').optional().isEmail().withMessage('بريد إلكتروني غير صالح'),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const user = await User.findByPk(req.user.id);
      if (!user) throw notFound('User');

      const updates = {};
      if (req.body.full_name != null) updates.full_name = req.body.full_name;
      if (req.body.email != null) {
        updates.email = String(req.body.email).trim().toLowerCase();
      }
      if (Object.keys(updates).length) {
        await user.update(updates);
      }
      res.json({ ok: true, data: safeUser(user) });
    }),
  );
   
  // --- GET /api/users/me/roles -----------------------------------------------
router.get(
  "/me/roles",
  authenticate(),
  asyncHandler(async (req, res) => {
    

    // Legacy roles (إن وجدت)
    const roles = await getUserRoles(req.user.id, models);

res.json({
  ok: true,
  data: {
    roles,
  },
});
  })
);
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = {};
      if (req.query.is_active) where.is_active = req.query.is_active === 'true';
      const { rows, count } = await User.findAndCountAll({
        where,
        limit,
        offset,
        // never expose password_hash
        attributes: { exclude: ['password_hash'] },
        order: [['created_at', 'DESC']],
      });
      res.json(paginatedResponse(rows, count, { page, limit }));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ['password_hash'] },
      });
      if (!user) throw notFound('User');
      res.json({ ok: true, data: user });
    }),
  );

  router.post(
'/',
requireFullAdmin,
[
      body('email').isEmail().withMessage('valid email required'),
      body('phone').isString().isLength({ min: 5, max: 20 }).withMessage('phone required'),
      body('full_name').isString().isLength({ min: 1, max: 150 }).withMessage('full_name required'),
      body('password').isString().isLength({ min: 8 }).withMessage('password min 8 chars'),
      body('is_guest').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { password, ...rest } = req.body;
      const password_hash = await bcrypt.hash(password, 10);
      const user = await User.create({ ...rest, password_hash });
      const safe = user.toJSON();
      delete safe.password_hash;
      res.status(201).json({ ok: true, data: safe });
    }),
  );

  router.put(
'/:id',
requireFullAdmin,
[
      body('email').optional().isEmail(),
      body('phone').optional().isString().isLength({ min: 5, max: 20 }),
      body('full_name').optional().isString().isLength({ min: 1, max: 150 }),
      body('password').optional().isString().isLength({ min: 8 }),
      body('is_active').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const user = await User.findByPk(req.params.id);
      if (!user) throw notFound('User');
      const { password, ...rest } = req.body;
      const updates = { ...rest };
      if (password) updates.password_hash = await bcrypt.hash(password, 10);
      await user.update(updates);
      const safe = user.toJSON();
      delete safe.password_hash;
      res.json({ ok: true, data: safe });
    }),
  );

  router.delete(
'/:id',
requireFullAdmin,
asyncHandler(async (req, res) => {
      const user = await User.findByPk(req.params.id);
      if (!user) throw notFound('User');
      await user.destroy(); // soft delete (paranoid)
      res.json({ ok: true, message: 'User deleted' });
    }),
  );

  return router;
}
