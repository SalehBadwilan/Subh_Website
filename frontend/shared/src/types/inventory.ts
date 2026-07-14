export interface StockLevel {
  productId: string;
  available: number;
  reserved: number;
  /** عتبة التنبيه عند انخفاض المخزون. */
  lowStockThreshold: number;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  /** موجب/سالب. */
  delta: number;
  reason: 'sale' | 'restock' | 'adjustment' | 'return' | 'damage';
  note?: string;
  at: string;
  byUserId: string;
}
