import { getDb } from '../db';
import { calcOrderTotal } from '../../utils/price';
import { OrderStatus } from '../../types/order';
import type { Order, OrderItem } from '../../types/order';
import type { PaymentIntent } from '../../types/payment';
import type { ApiResult, ApiError } from '../../types/api';
import { API_ERROR_CODES } from '../../constants/config';

function apiError(code: string, message: string, field?: string): ApiError {
  return { code, message, field };
}

export interface MockCheckoutHandler {
  intent(cartId: string, fail?: boolean): Promise<ApiResult<PaymentIntent>>;
  /** ⚠️ idempotencyKey إلزامي — تكراره يُرجع نفس الطلب. */
  confirm(input: {
    intentId: string;
    addressId: string;
    shippingMethodId: string;
    idempotencyKey: string;
  }, fail?: boolean): Promise<ApiResult<Order>>;
  listOrders(status?: OrderStatus): Promise<ApiResult<{ items: Order[]; total: number; hasMore: boolean }>>;
  getOrder(id: string): Promise<ApiResult<Order>>;
  cancelOrder(id: string): Promise<ApiResult<Order>>;
}

export function createMockCheckoutHandler(): MockCheckoutHandler {
  return {
    async intent(cartId, fail) {
      const db = getDb();
      const cart = db.carts.get(cartId);
      if (!cart || cart.items.length === 0) {
        throw apiError(API_ERROR_CODES.CART_CHANGED, 'السلة فارغة.');
      }
      if (fail) {
        // محاكاة فشل دفع (لا نُلقي هنا — نُرجع intent مع علم سيئ ليُفشل confirm).
        return { data: { intentId: `pi_fail_${Date.now()}`, clientSecret: 'mock_secret_fail', amount: cart.subtotal, currency: 'SAR' } };
      }
      return { data: { intentId: `pi_${Date.now()}`, clientSecret: 'mock_secret', amount: cart.subtotal, currency: 'SAR' } };
    },

    async confirm(input, fail) {
      const db = getDb();

      // 1) idempotency: إن وُجد المفتاح، أرجع نفس الطلب.
      const existing = db.idempotencyKeys.get(input.idempotencyKey);
      if (existing) {
        const order = db.orders.find((o) => o.id === existing);
        if (order) return { data: order };
      }

      // 2) محاكاة timeout عشوائي (10% احتمال) — يختبر loading/idempotency في الواجهة.
      if (Math.random() < 0.1) {
        await new Promise((_, reject) => setTimeout(() => reject(apiError(API_ERROR_CODES.TIMEOUT, 'انتهت مهلة الطلب. حاول مرة أخرى.')), 8000));
      }

      const cart = db.carts.get('cart_guest');
      if (!cart || cart.items.length === 0) {
        throw apiError(API_ERROR_CODES.CART_CHANGED, 'السلة تغيّرت. راجعها قبل التأكيد.');
      }

      // 3) التحقق من المخزون (حالة آخر قطعة — سيناريو 4).
      for (const item of cart.items) {
        const stock = db.stock.get(item.productId) ?? 0;
        if (item.quantity > stock) {
          throw apiError(API_ERROR_CODES.STOCK_INSUFFICIENT, `الكمية المطلوبة من «${item.name}» غير متاحة (المتاح ${stock}).`, 'quantity');
        }
      }

      // 4) محاكاة فشل دفع عبر ?fail=1.
      if (fail || input.intentId.startsWith('pi_fail_')) {
        throw apiError(API_ERROR_CODES.PAYMENT_FAILED, 'فشل عملية الدفع. تأكد من وسيلة الدفع وحاول مجدداً.');
      }

      // 5) إنشاء الطلب.
      const address = db.addresses.find((a) => a.id === input.addressId) ?? db.addresses[0]!;
      if (!address) {
        throw apiError(API_ERROR_CODES.VALIDATION_ERROR, 'العنوان مطلوب.');
      }
      const shippingCost = input.shippingMethodId === 'express' ? 45 : 25;
      const totals = calcOrderTotal(cart.items, shippingCost);
      const order: Order = {
        id: `o_${Date.now()}`,
        code: `SBH-2026-${String(100 + db.orders.length + 1).padStart(6, '0')}`,
        status: OrderStatus.RECEIVED,
        items: cart.items.map<OrderItem>((i) => ({
          id: i.id, productId: i.productId, productSlug: i.productSlug, name: i.name,
          imageUrl: i.imageUrl, merchantId: i.merchantId, merchantName: i.merchantName,
          quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal,
        })),
        subtotal: totals.subtotal, shippingCost: totals.shipping, tax: totals.tax, total: totals.total,
        shippingAddress: address, shippingMethod: (input.shippingMethodId as Order['shippingMethod']) ?? 'standard',
        paymentStatus: 'paid',
        timeline: [{ status: OrderStatus.RECEIVED, at: new Date().toISOString(), note: 'تم إنشاء الطلب' }],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };

      // 6) خصم المخزون + تسجيل idempotency.
      for (const item of cart.items) {
        const s = db.stock.get(item.productId) ?? 0;
        db.stock.set(item.productId, Math.max(0, s - item.quantity));
      }
      db.orders.push(order);
      db.idempotencyKeys.set(input.idempotencyKey, order.id);
      db.carts.delete('cart_guest');

      return { data: order };
    },

    async listOrders(status) {
      const db = getDb();
      const items = status ? db.orders.filter((o) => o.status === status) : db.orders;
      return { data: { items, total: items.length, hasMore: false } };
    },

    async getOrder(id) {
      const db = getDb();
      const order = db.orders.find((o) => o.id === id);
      if (!order) throw apiError(API_ERROR_CODES.NOT_FOUND, 'الطلب غير موجود.');
      return { data: order };
    },

    async cancelOrder(id) {
      const db = getDb();
      const order = db.orders.find((o) => o.id === id);
      if (!order) throw apiError(API_ERROR_CODES.NOT_FOUND, 'الطلب غير موجود.');
      if (order.status !== OrderStatus.RECEIVED && order.status !== OrderStatus.PROCESSING) {
        throw apiError(API_ERROR_CODES.VALIDATION_ERROR, 'لا يمكن إلغاء الطلب في هذه الحالة.');
      }
      order.status = OrderStatus.CANCELLED;
      order.timeline.push({ status: OrderStatus.CANCELLED, at: new Date().toISOString(), note: 'أُلغي بواسطة العميل' });
      order.updatedAt = new Date().toISOString();
      return { data: order };
    },
  };
}
