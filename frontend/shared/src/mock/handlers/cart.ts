import { getDb } from '../db';
import { calcOrderTotal, round2 } from '../../utils/price';
import type { Cart, CartItem, CartQuote } from '../../types/cart';
import type { ApiResult, ApiError } from '../../types/api';
import { API_ERROR_CODES } from '../../constants/config';

function apiError(code: string, message: string, field?: string): ApiError {
  return { code, message, field };
}

const GUEST_CART_ID = 'cart_guest';

function recompute(cart: Cart): Cart {
  const subtotal = round2(cart.items.reduce((s, i) => s + i.lineTotal, 0));
  return {
    ...cart,
    itemCount: cart.items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    updatedAt: new Date().toISOString(),
  };
}

export interface MockCartHandler {
  get(): Promise<ApiResult<Cart>>;
  addItem(productId: string, quantity: number): Promise<ApiResult<Cart>>;
  updateItem(id: string, quantity: number): Promise<ApiResult<Cart>>;
  removeItem(id: string): Promise<ApiResult<Cart>>;
  quote(addressId: string): Promise<ApiResult<CartQuote>>;
}

export function createMockCartHandler(): MockCartHandler {
  return {
    async get() {
      const db = getDb();
      let cart = db.carts.get(GUEST_CART_ID);
      if (!cart) {
        cart = recompute({ id: GUEST_CART_ID, items: [], itemCount: 0, subtotal: 0, currency: 'SAR', updatedAt: new Date().toISOString() });
        db.carts.set(GUEST_CART_ID, cart);
      }
      return { data: cart };
    },

    async addItem(productId, quantity) {
      const db = getDb();
      const cart = db.carts.get(GUEST_CART_ID) ?? { id: GUEST_CART_ID, items: [], itemCount: 0, subtotal: 0, currency: 'SAR', updatedAt: new Date().toISOString() };
      const product = db.products.find((p) => p.id === productId);
      if (!product) throw apiError(API_ERROR_CODES.PRODUCT_NOT_FOUND, 'المنتج غير موجود.', 'productId');
      if (!product.inStock) throw apiError(API_ERROR_CODES.STOCK_INSUFFICIENT, 'المنتج غير متوفر.', 'productId');
      const stock = db.stock.get(productId) ?? 10;
      if (quantity > stock) throw apiError(API_ERROR_CODES.STOCK_INSUFFICIENT, `المتاح ${stock} فقط.`, 'quantity');

      const existing = cart.items.find((i) => i.productId === productId);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, stock, 99);
        existing.lineTotal = round2(existing.unitPrice * existing.quantity);
        existing.maxStock = stock;
      } else {
        const item: CartItem = {
          id: `ci_${Date.now()}`,
          productId, productSlug: product.slug, name: product.name,
          imageUrl: product.images[0]?.url, merchantId: product.merchantId, merchantName: product.merchantName,
          unitPrice: product.price, quantity, maxStock: stock, lineTotal: round2(product.price * quantity),
        };
        cart.items.push(item);
      }
      const updated = recompute(cart);
      db.carts.set(GUEST_CART_ID, updated);
      return { data: updated };
    },

    async updateItem(id, quantity) {
      const db = getDb();
      const cart = db.carts.get(GUEST_CART_ID);
      if (!cart) throw apiError(API_ERROR_CODES.NOT_FOUND, 'السلة غير موجودة.');
      const item = cart.items.find((i) => i.id === id);
      if (!item) throw apiError(API_ERROR_CODES.NOT_FOUND, 'العنصر غير موجود.', 'id');
      if (quantity > item.maxStock) throw apiError(API_ERROR_CODES.STOCK_INSUFFICIENT, `المتاح ${item.maxStock} فقط.`, 'quantity');
      item.quantity = quantity;
      item.lineTotal = round2(item.unitPrice * quantity);
      const updated = recompute(cart);
      db.carts.set(GUEST_CART_ID, updated);
      return { data: updated };
    },

    async removeItem(id) {
      const db = getDb();
      const cart = db.carts.get(GUEST_CART_ID);
      if (!cart) throw apiError(API_ERROR_CODES.NOT_FOUND, 'السلة غير موجودة.');
      cart.items = cart.items.filter((i) => i.id !== id);
      const updated = recompute(cart);
      db.carts.set(GUEST_CART_ID, updated);
      return { data: updated };
    },

    async quote(_addressId) {
      const db = getDb();
      const cart = db.carts.get(GUEST_CART_ID);
      if (!cart) throw apiError(API_ERROR_CODES.NOT_FOUND, 'السلة غير موجودة.');
      const totals = calcOrderTotal(cart.items, 25); // شحن عادي افتراضي
      const quote: CartQuote = { subtotal: totals.subtotal, shippingCost: totals.shipping, tax: totals.tax, total: totals.total, currency: 'SAR' };
      return { data: quote };
    },
  };
}
