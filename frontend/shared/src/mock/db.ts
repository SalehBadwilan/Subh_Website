/**
 * قاعدة بيانات وهمية in-memory — تُحمّل من data/* عند التهيئة.
 * تُعيد ضبطها في كل تحميل صفحة (ويب) أو إقلاع (موبايل).
 */
import type { Product } from '../types/product';
import type { Category } from '../types/category';
import type { Merchant } from '../types/merchant';
import type { Plan } from '../types/plan';
import type { User } from '../types/user';
import type { Order } from '../types/order';
import type { Address } from '../types/address';
import type { Cart } from '../types/cart';

import { mockProducts } from './data/products';
import { mockCategories } from './data/categories';
import { mockMerchants } from './data/merchants';
import { mockPlans } from './data/plans';
import { mockUsers } from './data/users';
import { mockOrders } from './data/orders';
import { mockAddresses } from './data/addresses';

export interface MockDB {
  products: Product[];
  categories: Category[];
  merchants: Merchant[];
  plans: Plan[];
  users: User[];
  orders: Order[];
  addresses: Address[];
  carts: Map<string, Cart>;
  /** محاولات OTP: attemptId → { phone, code, issuedAt }. */
  otpAttempts: Map<string, { phone: string; code: string; issuedAt: number }>;
  /** مفاتيح idempotency المستخدمة: key → orderId (لإرجاع نفس الطلب). */
  idempotencyKeys: Map<string, string>;
  /** مخزون المنتجات: productId → available. */
  stock: Map<string, number>;
}

let dbInstance: MockDB | null = null;

/** يُنشئ/يُعيد نسخة DB وهمية. */
export function getDb(): MockDB {
  if (dbInstance) return dbInstance;
  dbInstance = {
    products: [...mockProducts],
    categories: [...mockCategories],
    merchants: [...mockMerchants],
    plans: [...mockPlans],
    users: [...mockUsers],
    orders: [...mockOrders],
    addresses: [...mockAddresses],
    carts: new Map(),
    otpAttempts: new Map(),
    idempotencyKeys: new Map(),
    stock: new Map(mockProducts.map((p) => [p.id, p.variants[0]?.stock ?? 10])),
  };
  return dbInstance;
}

/** إعادة الضبط (لاختبارات). */
export function resetDb(): void {
  dbInstance = null;
  getDb();
}
