import { getDb } from '../db';
import type { StockLevel, InventoryMovement } from '../../types/inventory';
import type { ApiResult, ApiError } from '../../types/api';
import { API_ERROR_CODES } from '../../constants/config';

function apiError(code: string, message: string): ApiError {
  return { code, message };
}

/**
 * محاكاة حالات المخزون الحرجة (سيناريو 4: آخر قطعة).
 * البيع فوق المتاح مرفوض حتى لو طلب مستخدمان نفس القطعة «بالتزامن».
 */
export interface MockInventoryHandler {
  list(): Promise<ApiResult<StockLevel[]>>;
  movements(productId: string): Promise<ApiResult<InventoryMovement[]>>;
  /** قفل متزامن: يخصم إن توفر، يرفض وإلا. */
  reserve(productId: string, quantity: number): Promise<ApiResult<{ ok: boolean; remaining: number }>>;
}

export function createMockInventoryHandler(): MockInventoryHandler {
  return {
    async list() {
      const db = getDb();
      const levels: StockLevel[] = db.products.map((p) => ({
        productId: p.id,
        available: db.stock.get(p.id) ?? 0,
        reserved: 0,
        lowStockThreshold: 3,
      }));
      return { data: levels };
    },

    async movements(_productId) {
      return { data: [] };
    },

    async reserve(productId, quantity) {
      const db = getDb();
      const current = db.stock.get(productId) ?? 0;
      if (quantity > current) {
        throw apiError(API_ERROR_CODES.STOCK_INSUFFICIENT, `المتاح ${current} فقط. لا يمكن حجز ${quantity}.`);
      }
      db.stock.set(productId, current - quantity);
      return { data: { ok: true, remaining: current - quantity } };
    },
  };
}
