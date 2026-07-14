import type { Order } from '../../types/order';
import { OrderStatus } from '../../types/order';
import type { PaymentStatus } from '../../types/payment';

const addr = {
  id: 'a1', label: 'المنزل', recipientName: 'عميل تجريبي', phone: '+966500000001',
  city: 'الرياض', district: 'النرجس', street: 'شارق التفاح', building: '12', isDefault: true,
};

export const mockOrders: Order[] = [
  {
    id: 'o1', code: 'SBH-2026-000123', status: OrderStatus.DELIVERED,
    items: [{
      id: 'oi1', productId: 'pr1', productSlug: 'sabah-smart-mug', name: 'كوب صبح الذكي',
      imageUrl: 'https://picsum.photos/seed/mug/200', merchantId: 'm1', merchantName: 'متجر الأفق',
      quantity: 1, unitPrice: 149, lineTotal: 149,
    }],
    subtotal: 149, shippingCost: 25, tax: 22.35, total: 196.35,
    shippingAddress: addr, shippingMethod: 'standard',
    paymentStatus: 'paid' as PaymentStatus,
    trackingNumber: 'SMSA-12345',
    timeline: [
      { status: OrderStatus.RECEIVED, at: '2026-07-01T08:00:00Z' },
      { status: OrderStatus.PROCESSING, at: '2026-07-01T10:00:00Z' },
      { status: OrderStatus.SHIPPED, at: '2026-07-02T09:00:00Z' },
      { status: OrderStatus.DELIVERED, at: '2026-07-05T14:00:00Z' },
    ],
    createdAt: '2026-07-01T08:00:00Z', updatedAt: '2026-07-05T14:00:00Z',
  },
  {
    id: 'o2', code: 'SBH-2026-000124', status: OrderStatus.SHIPPED,
    items: [{
      id: 'oi2', productId: 'pr2', productSlug: 'morning-light-lamp', name: 'مصباح شروق',
      imageUrl: 'https://picsum.photos/seed/lamp/200', merchantId: 'm2', merchantName: 'بيت الأناقة',
      quantity: 1, unitPrice: 219, lineTotal: 219,
    }],
    subtotal: 219, shippingCost: 45, tax: 32.85, total: 296.85,
    shippingAddress: addr, shippingMethod: 'express',
    paymentStatus: 'paid' as PaymentStatus,
    trackingNumber: 'SMSA-67890',
    timeline: [
      { status: OrderStatus.RECEIVED, at: '2026-07-10T08:00:00Z' },
      { status: OrderStatus.PROCESSING, at: '2026-07-10T12:00:00Z' },
      { status: OrderStatus.SHIPPED, at: '2026-07-11T09:00:00Z' },
    ],
    createdAt: '2026-07-10T08:00:00Z', updatedAt: '2026-07-11T09:00:00Z',
  },
];
