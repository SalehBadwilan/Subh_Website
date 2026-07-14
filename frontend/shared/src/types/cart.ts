export interface CartItem {
  id: string;
  productId: string;
  productSlug: string;
  name: string;
  imageUrl?: string;
  merchantId: string;
  merchantName: string;
  unitPrice: number;
  quantity: number;
  /** الحد الأقصى للكمية المتاح من المخزون. */
  maxStock: number;
  lineTotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  currency: 'SAR';
  updatedAt: string;
}

/** ناتج `POST /cart/quote` — حساب خادمي موثوق للإجماليات. */
export interface CartQuote {
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: 'SAR';
}
