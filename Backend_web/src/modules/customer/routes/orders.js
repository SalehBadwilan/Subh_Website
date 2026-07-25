/**
 * Customer order routes (authenticated).
 *
 *   POST /api/orders        place a new order (atomic: stock check + decrement)
 *   GET  /api/orders        list the user's own orders (paginated)
 *   GET  /api/orders/:id    fetch one of the user's own orders
 *
 * Stock handling:
 *  - For each line, available = on_hand - reserved is checked inside the txn.
 *  - If any line is short, the transaction rolls back and we return 409.
 *  - On success we record a 'consume' StockMovement and decrement on_hand.
 *
 * Authorization: every read/write is scoped to req.user.id. A user can NEVER
 * see or operate on another user's order (404 if they try).
 */
import { Router } from 'express';
import { body, query } from 'express-validator';

import asyncHandler from '../../../utils/asyncHandler.js';
import { ApiError, badRequest, notFound, conflict } from '../../../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../../../utils/paginate.js';
import validate from '../../../middleware/validate.js';
import authenticate from '../../../middleware/auth.js';
import sequelize from '../../../config/database.js';

export default function createCustomerOrderRoutes({ models }) {
  const router = Router();

   const {
  Order,
  OrderItem,
  OrderStatusHistory,
  Product,
  ProductImage,
  Package,
  Address,
  MerchantProduct,
  Inventory,
  StockMovement,
} = models;
  

  router.use(authenticate());

  const round2 = (n) => Number(Number(n).toFixed(2));

  /**
   * Resolve one order line from a payload item, validating existence, active
   * status, merchant authorization and STOCK availability — all inside the txn.
   * Returns the fields needed to build an OrderItem + the stock consumption.
   */
  const resolveLine = async (item, t) => {
    const hasProduct = Boolean(item.product_id);
    const hasPackage = Boolean(item.package_id);
    if (hasProduct === hasPackage) {
      throw badRequest('يجب تحديد إما product_id أو package_id لكل عنصر', { item });
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw badRequest('الكمية يجب أن تكون عددًا صحيحًا موجبًا', { item });
    }

    let sellable;
    let sellableType;
    let merchantProduct;
    if (hasProduct) {
  sellable = await Product.findByPk(item.product_id, { transaction: t });
  if (!sellable || sellable.status !== 'active') throw notFound('Product');
  sellableType = 'product';

  const where = {
  product_id: sellable.id,
  is_active: true,
};

if (item.merchant_id) {
  where.merchant_id = item.merchant_id;
}

merchantProduct = await MerchantProduct.findOne({
  where,
  transaction: t,
});

} else {
  sellable = await Package.findByPk(item.package_id, { transaction: t });
  if (!sellable || sellable.status !== 'active') throw notFound('Package');
  sellableType = 'package';

  const where = {
  package_id: sellable.id,
  is_active: true,
};

if (item.merchant_id) {
  where.merchant_id = item.merchant_id;
}

merchantProduct = await MerchantProduct.findOne({
  where,
  transaction: t,
});
}

    if (!merchantProduct) {
      throw badRequest('لا يوجد تاجر مخوّل لبيع هذا العنصر', { item });
    }

    // Stock check + reserve. Lock the inventory row for the transaction.
    const inventory = await Inventory.findOne({
      where: { sellable_type: sellableType, sellable_id: sellable.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!inventory) {
      throw conflict('الكمية غير متوفرة حاليًا', {
        item,
        reason: 'no_inventory',
      });
    }

    const available = (inventory.on_hand || 0) - (inventory.reserved || 0);
    if (available < quantity) {
      throw conflict('الكمية المطلوبة غير متوفرة', {
        item,
        available,
        requested: quantity,
        reason: 'insufficient_stock',
      });
    }

    return {
      sellable,
      sellableType,
      merchantId: merchantProduct.merchant_id,
      quantity,
      unitPrice: Number(sellable.price_sar),
      vatRate: Number(sellable.vat_rate),
      inventory,
    };
  };


  const serializeOrder = (order) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    currency: order.currency,
    subtotal_sar: Number(order.subtotal_sar),
    discount_sar: Number(order.discount_sar),
    shipping_sar: Number(order.shipping_sar),
    vat_sar: Number(order.vat_sar),
    total_sar: Number(order.total_sar),
    notes_ar: order.notes_ar,
    placed_at: order.placed_at,
    paid_at: order.paid_at,
    cancelled_at: order.cancelled_at,
    shipping_address_id: order.shipping_address_id,
    items: (order.OrderItems || []).map((i) => ({
      id: i.id,
      product_id: i.product_id,
      package_id: i.package_id,
      merchant_id: i.merchant_id,
      name_snapshot_ar: i.name_snapshot_ar,
      sku_snapshot: i.sku_snapshot,
      quantity: i.quantity,
      unit_price_sar: Number(i.unit_price_sar),
      line_total_sar: Number(i.line_total_sar),
      image_url:
  i.Product?.ProductImages?.find((img) => img.is_primary)?.url ??
  i.Product?.ProductImages?.[0]?.url ??
  null,
    })),
  });

  // --- POST /api/orders -----------------------------------------------------
  // Body:
  //   shipping_address_id: UUID (must belong to the user)
  //   items: [{ product_id | package_id, quantity }]  (mutually exclusive per item)
  //   notes?: string
  router.post(
    '/',
    [
  body('shipping_address_id').isUUID().withMessage('shipping_address_id مطلوب وصالح'),
  body('items')
    .isArray({ min: 1, max: 100 })
    .withMessage('items يجب أن تكون مصفوفة غير فارغة'),
  body('items.*.product_id').optional().isUUID(),
  body('items.*.package_id').optional().isUUID(),
  body('items.*.merchant_id').optional().isUUID(),
  body('items.*.quantity').isInt({ min: 1, max: 999 }),
  body('notes').optional().isString().isLength({ max: 1000 }),
],

(req, res, next) => {
  console.log("========== REQUEST BODY ==========");
  console.dir(req.body, { depth: null });
  next();
},

validate,

asyncHandler(async (req, res) => {
      const { shipping_address_id, items, notes } = req.body;

      const result = await sequelize.transaction(async (t) => {
        // 1) Shipping address must belong to the authenticated user.
        const address = await Address.findOne({
          where: { id: shipping_address_id, user_id: req.user.id },
          transaction: t,
        });
        if (!address) {
          throw notFound('Address');
        }

        // 2) Resolve every line + validate stock (locks rows).
        const resolved = await Promise.all(items.map((i) => resolveLine(i, t)));

        // MVP: one order belongs to a single merchant. If the items span
        // multiple merchants, reject with a clear error rather than silently
        // splitting (splitting is a later phase per the order model notes).
        const merchantIds = [...new Set(resolved.map((r) => r.merchantId))];
        if (merchantIds.length > 1) {
          throw badRequest('لا يمكن إنشاء طلب واحد لعدة تجار، يرجى فصل الطلبات', {
            merchants: merchantIds,
          });
        }
        const merchantId = merchantIds[0];

        // 3) Decrement stock + write stock movements.
        for (const r of resolved) {
          await r.inventory.update(
            { on_hand: r.inventory.on_hand - r.quantity },
            { transaction: t },
          );
          await StockMovement.create(
            {
              inventory_id: r.inventory.id,
              type: 'consume',
              delta: -r.quantity,
              reason: 'order_placed',
              reference_type: 'order',
              actor_id: req.user.id,
            },
            { transaction: t },
          );
        }

        // 4) Compute totals.
        // Catalog prices are VAT-INCLUSIVE (per the Product model MVP note), so
        // we split each line into net (ex-VAT) + vat. The orders table enforces
        // chk_orders_consistency: total = subtotal - discount + shipping + vat.
        // v1 has no discount/shipping, so total = subtotal + vat.
        let subtotalNet = 0;
        let vatTotal = 0;
        for (const r of resolved) {
          const gross = r.unitPrice * r.quantity; // VAT-inclusive line
          const net = gross / (1 + r.vatRate); // ex-VAT line
          subtotalNet += net;
          vatTotal += gross - net;
        }
        const subtotal = round2(subtotalNet); // ex-VAT
        const vatByLine = round2(vatTotal); // VAT portion
        const total = round2(subtotal + vatByLine); // = gross sum, satisfies the CHECK
        const number = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const order = await Order.create(
          {
            number,
            user_id: req.user.id,
            merchant_id: merchantId,
            shipping_address_id: address.id,
            status: 'pending_payment',
            currency: 'SAR',
            subtotal_sar: subtotal,
            discount_sar: 0,
            shipping_sar: 0,
            vat_sar: vatByLine,
            total_sar: total,
            notes_ar: notes || null,
            placed_at: new Date(),
          },
          { transaction: t },
        );

        // 5) Order items with snapshots (so historical orders stay accurate).
        await OrderItem.bulkCreate(
          resolved.map((r) => ({
            order_id: order.id,
            merchant_id: r.merchantId,
            product_id: r.sellableType === 'product' ? r.sellable.id : null,
            package_id: r.sellableType === 'package' ? r.sellable.id : null,
            name_snapshot_ar: r.sellable.name_ar,
            sku_snapshot: r.sellable.sku,
            quantity: r.quantity,
            unit_price_sar: r.unitPrice,
            vat_rate: r.vatRate,
            line_total_sar: round2(r.unitPrice * r.quantity),
          })),
          { transaction: t, validate: true },
        );

        // 6) Initial status history entry.
        await OrderStatusHistory.create(
          {
            order_id: order.id,
            from_status: null,
            to_status: 'pending_payment',
            comment_ar: 'تم إنشاء الطلب',
            actor_id: req.user.id,
          },
          { transaction: t },
        );

        return order;
      });

      // Reload with items for the response.
      const full = await Order.findByPk(result.id, {
        include: [
    {
    model: OrderItem,
    as: 'OrderItems',
    required: false,
    include: [
      {
        model: Product,
        required: false,
        include: [
          {
            model: ProductImage,
            required: false,
          },
        ],
      },
    ],
  },
],
      });
      res.status(201).json({ ok: true, data: serializeOrder(full) });
    }),
  );

  // --- GET /api/orders ------------------------------------------------------
  router.get(
    '/',
    [
      query('status').optional().isIn([
        'pending_payment',
        'paid',
        'preparing',
        'ready_to_ship',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
      ]),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const where = { user_id: req.user.id };
      if (req.query.status) where.status = req.query.status;

      const { rows, count } = await Order.findAndCountAll({
  where,
  include: [
    {
      model: OrderItem,
      as: 'OrderItems',
      required: false,
      include: [
        {
          model: Product,
          required: false,
          include: [
            {
              model: ProductImage,
              required: false,
            },
          ],
        },
      ],
    },
  ],
  limit,
  offset,
  order: [['created_at', 'DESC']],
  distinct: true,
});
        

      res.json(paginatedResponse(rows.map(serializeOrder), count, { page, limit }));
    }),
  );

  // --- GET /api/orders/:id --------------------------------------------------
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const order = await Order.findOne({
  where: { id: req.params.id, user_id: req.user.id },
  include: [
    {
      model: OrderItem,
      as: 'OrderItems',
      required: false,
      include: [
        {
          model: Product,
          required: false,
          include: [
            {
              model: ProductImage,
              required: false,
            },
          ],
        },
      ],
    },
  ],
});
      if (!order) throw notFound('Order');
      res.json({ ok: true, data: serializeOrder(order) });
    }),
  );

  return router;
}
