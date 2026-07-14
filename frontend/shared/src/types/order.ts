import type { Address } from './address';
import type { ShippingMethod } from './shipping';
import type { PaymentStatus } from './payment';

/** حالات الطلب. التسلسل الزمني في `constants/order-status.ts`. */
export enum OrderStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface OrderItem {
  id: string;
  productId: string;
  productSlug: string;
  name: string;
  imageUrl?: string;
  merchantId: string;
  merchantName: string;
  quantity: number;
  /** سعر البيع الموحّد (العميل يرى نفس السعر على كل المنصة). */
  unitPrice: number;
  lineTotal: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  /** رقم ظاهر للعميل: SBH-2026-000123 */
  code: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  /** ضريبة القيمة المضافة 15% SAR. */
  tax: number;
  total: number;
  shippingAddress: Address;
  shippingMethod: ShippingMethod;
  paymentStatus: PaymentStatus;
  trackingNumber?: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  items: { id: string; quantity: number }[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
}
