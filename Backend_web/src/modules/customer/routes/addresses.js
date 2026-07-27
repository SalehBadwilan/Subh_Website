/**
 * Customer address routes (authenticated).
 *
 *   GET    /api/addresses            list the user's addresses
 *   POST   /api/addresses            create a new address
 *   PUT    /api/addresses/:id         update one of the user's addresses
 *   DELETE /api/addresses/:id         delete one of the user's addresses
 *   POST   /api/addresses/:id/default mark one address as default (unsets others)
 *
 * Authorization: every query is scoped to req.user.id. A user can only ever
 * touch their own addresses; any other id returns 404 (not 403, to avoid
 * leaking existence).
 *
 * Setting a default unsets the default flag on the rest of the user's
 * addresses inside a transaction so the invariant "at most one default" holds.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import { notFound } from '../../../utils/ApiError.js';
import validate from '../../../middleware/validate.js';
import authenticate from '../../../middleware/auth.js';
import sequelize from '../../../config/database.js';

export default function createCustomerAddressRoutes({ models }) {
  const router = Router();
  const { Address } = models;

  router.use(authenticate());

  const serializeAddress = (a) => ({
    id: a.id,
    recipient_name: a.recipient_name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    region: a.region,
    postal_code: a.postal_code,
    lat: a.lat,
    lng: a.lng,
    is_default: a.is_default,
  });

  const createValidators = [
    body('recipient_name').isString().trim().isLength({ min: 1, max: 150 }),
    body('phone').isString().trim().isLength({ min: 4, max: 20 }),
    body('line1').isString().trim().isLength({ min: 1, max: 255 }),
    body('line2').optional().isString().isLength({ max: 255 }),
    body('city').isString().trim().isLength({ min: 1, max: 100 }),
    body('region').isString().trim().isLength({ min: 1, max: 100 }),
    body('postal_code').optional().isString().isLength({ max: 20 }),
    body('lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    body('lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
    body('is_default').optional().isBoolean(),
  ];

  // --- GET /api/addresses ---------------------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const rows = await Address.findAll({
        where: { user_id: req.user.id },
        order: [['is_default', 'DESC'], ['created_at', 'DESC']],
      });
      res.json({ ok: true, data: rows.map(serializeAddress) });
    }),
  );

  // --- POST /api/addresses --------------------------------------------------
  router.post(
    '/',
    createValidators,
    validate,
    asyncHandler(async (req, res) => {
      const created = await sequelize.transaction(async (t) => {
        // If creating as default, clear the existing default first.
        if (req.body.is_default) {
          await Address.update(
            { is_default: false },
            { where: { user_id: req.user.id, is_default: true }, transaction: t },
          );
        }
        return Address.create({ ...req.body, user_id: req.user.id }, { transaction: t });
      });
      res.status(201).json({ ok: true, data: serializeAddress(created) });
    }),
  );

  // --- PUT /api/addresses/:id ----------------------------------------------
  router.put(
    '/:id',
    [
      body('recipient_name').optional().isString().trim().isLength({ min: 1, max: 150 }),
      body('phone').optional().isString().trim().isLength({ min: 4, max: 20 }),
      body('line1').optional().isString().trim().isLength({ min: 1, max: 255 }),
      body('line2').optional().isString().isLength({ max: 255 }),
      body('city').optional().isString().trim().isLength({ min: 1, max: 100 }),
      body('region').optional().isString().trim().isLength({ min: 1, max: 100 }),
      body('postal_code').optional().isString().isLength({ max: 20 }),
      body('lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
      body('lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
      body('is_default').optional().isBoolean(),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const address = await Address.findOne({
        where: { id: req.params.id, user_id: req.user.id },
      });
      if (!address) throw notFound('Address');

      await sequelize.transaction(async (t) => {
        // Promoting to default clears the previous default.
        if (req.body.is_default === true) {
          await Address.update(
            { is_default: false },
            { where: { user_id: req.user.id, is_default: true, id: { [Op.ne]: address.id } }, transaction: t },
          );
        }
        await address.update(req.body, { transaction: t });
      });

      res.json({ ok: true, data: serializeAddress(address) });
    }),
  );

  // --- DELETE /api/addresses/:id -------------------------------------------
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const deleted = await Address.destroy({
        where: { id: req.params.id, user_id: req.user.id },
      });
      if (!deleted) throw notFound('Address');
      res.json({ ok: true, message: 'تم حذف العنوان' });
    }),
  );

  // --- POST /api/addresses/:id/default -------------------------------------
  router.post(
    '/:id/default',
    asyncHandler(async (req, res) => {
      const address = await Address.findOne({
        where: { id: req.params.id, user_id: req.user.id },
      });
      if (!address) throw notFound('Address');

      await sequelize.transaction(async (t) => {
        // Unset default on all of the user's other addresses, then set this one.
        await Address.update(
          { is_default: false },
          { where: { user_id: req.user.id, is_default: true }, transaction: t },
        );
        await address.update({ is_default: true }, { transaction: t });
      });

      res.json({ ok: true, data: serializeAddress(address) });
    }),
  );

  return router;
}
