/**
 * Customer cart routes (authenticated).
 *
 *   GET /api/cart    return the current user's cart (created on demand)
 *   PUT /api/cart    replace the cart's items with the provided list
 *
 * A cart belongs to exactly one user (Cart.user_id is UNIQUE). The PUT is a
 * full replacement: the previous items are wiped and the new set is inserted
 * inside a transaction, so a failure never leaves a half-written cart.
 *
 * Authorization: every query is scoped to req.user.id, so a user can only ever
 * read/mutate their own cart.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { Op } from 'sequelize';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, badRequest, notFound } from '../../../utils/ApiError.js';
import validate from '../../../middleware/validate.js';
import authenticate from '../../../middleware/auth.js';
import sequelize from '../../../config/database.js';

export default function createCustomerCartRoutes({ models }) {
  const router = Router();
  const { Cart, CartItem, Product, Package, MerchantProduct } = models;

  // All cart routes require a registered (non-guest) user.
  router.use(authenticate());

  /**
   * Get-or-create the active cart for the authenticated user. Always returns
   * ONE cart row (uniqueness is enforced at the DB level via user_id unique).
   */
  const getOrCreateCart = async (userId, t) => {
    const [cart] = await Cart.findOrCreate({
      where: { user_id: userId, status: 'active' },
      defaults: { user_id: userId, currency: 'SAR', status: 'active' },
      transaction: t,
    });
    return cart;
  };

  /**
   * Resolve a sellable item from the request payload.
   *
   * Validates that:
   *  - exactly one of product_id / package_id is given
   *  - the item exists and is active (status='active')
   *  - the merchant is authorized to sell it (MerchantProduct row, is_active)
   *
   * Returns { product_id?, package_id?, merchant_id, unit_price_sar, sellable_type }.
   */
  const resolveItem = async (item, t) => {
    const hasProduct = Boolean(item.product_id);
    const hasPackage = Boolean(item.package_id);
    if (hasProduct === hasPackage) {
      throw badRequest('يجب تحديد إما product_id أو package_id لكل عنصر', { item });
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw badRequest('الكمية يجب أن تكون عددًا صحيحًا موجبًا', { item });
    }

    if (hasProduct) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product || product.status !== 'active') {
        throw notFound('Product');
      }

      // Find a merchant authorized to sell this product for this line.
      const mp = await MerchantProduct.findOne({
        where: { product_id: product.id, is_active: true },
        transaction: t,
      });
      if (!mp) {
        throw badRequest('لا يوجد تاجر مخوّل لبيع هذا المنتج', { product_id: product.id });
      }

      return {
        product_id: product.id,
        package_id: null,
        merchant_id: mp.merchant_id,
        unit_price_sar: Number(product.price_sar),
        sellable_type: 'product',
        sellable_id: product.id,
        quantity,
      };
    }

    // package branch
    const pkg = await Package.findByPk(item.package_id, { transaction: t });
    if (!pkg || pkg.status !== 'active') {
      throw notFound('Package');
    }
    const mp = await MerchantProduct.findOne({
      where: { package_id: pkg.id, is_active: true },
      transaction: t,
    });
    if (!mp) {
      throw badRequest('لا يوجد تاجر مخوّل لبيع هذه الباقة', { package_id: pkg.id });
    }

    return {
      product_id: null,
      package_id: pkg.id,
      merchant_id: mp.merchant_id,
      unit_price_sar: Number(pkg.price_sar),
      sellable_type: 'package',
      sellable_id: pkg.id,
      quantity,
    };
  };

  /**
   * Serialize a cart (with items) for the customer response, computing totals.
   */
  const serializeCart = (cart) => {
    const items = (cart.CartItems || []).map((i) => ({
      id: i.id,
      product_id: i.product_id,
      package_id: i.package_id,
      merchant_id: i.merchant_id,
      quantity: i.quantity,
      unit_price_sar: Number(i.unit_price_sar),
      line_total_sar: Number(i.unit_price_sar) * i.quantity,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.line_total_sar, 0);
    return {
      id: cart.id,
      status: cart.status,
      currency: cart.currency,
      items,
      subtotal_sar: Number(subtotal.toFixed(2)),
      items_count: items.length,
    };
  };

  // --- GET /api/cart --------------------------------------------------------
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const cart = await getOrCreateCart(req.user.id);
      // reload with items (findOrCreate does not include associations).
      const full = await Cart.findByPk(cart.id, {
        include: { model: CartItem, as: 'CartItems', required: false, order: [['created_at', 'ASC']] },
      });
      res.json({ ok: true, data: serializeCart(full) });
    }),
  );

  // --- PUT /api/cart --------------------------------------------------------
  // Replace the cart contents. Body: { items: [{ product_id|package_id, quantity }] }
  router.put(
    '/',
    [
      body('items')
        .optional()
        .isArray({ min: 0, max: 100 })
        .withMessage('items يجب أن تكون مصفوفة (0-100 عنصر)'),
      body('items.*.product_id').optional().isUUID(),
      body('items.*.package_id').optional().isUUID(),
      body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const items = Array.isArray(req.body.items) ? req.body.items : [];

      await sequelize.transaction(async (t) => {
        const cart = await getOrCreateCart(req.user.id, t);

        // Resolve + validate every incoming item up front (fails atomically).
        const resolved = items.length ? await Promise.all(items.map((i) => resolveItem(i, t))) : [];

        // Wipe existing lines, then insert the new set.
        await CartItem.destroy({ where: { cart_id: cart.id }, transaction: t });

        if (resolved.length) {
          await CartItem.bulkCreate(
            resolved.map((r) => ({
              cart_id: cart.id,
              product_id: r.product_id,
              package_id: r.package_id,
              merchant_id: r.merchant_id,
              quantity: r.quantity,
              unit_price_sar: r.unit_price_sar,
            })),
            { transaction: t, validate: true },
          );
        }
      });

      // Read back the persisted cart to return consistent data.
      const full = await Cart.findOne({
        where: { user_id: req.user.id, status: 'active' },
        include: { model: CartItem, as: 'CartItems', required: false, order: [['created_at', 'ASC']] },
      });
      res.json({ ok: true, data: serializeCart(full) });
    }),
  );

  return router;
}
