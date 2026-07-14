import { getDb } from '../db';
import type { MerchantFinance } from '../../types/finance';
import type { Plan } from '../../types/plan';
import type { Product } from '../../types/product';
import type { Order } from '../../types/order';
import type { StaffMember, Permission } from '../../types/staff';
import type { Merchant } from '../../types/merchant';
import type { Paginated, ApiResult, ApiError } from '../../types/api';
import { API_ERROR_CODES } from '../../constants/config';

function apiError(code: string, message: string): ApiError {
  return { code, message };
}

export interface MockMerchantHandler {
  onboarding(input: unknown): Promise<ApiResult<{ merchantId: string; status: 'pending' }>>;
  plans(): Promise<ApiResult<Plan[]>>;
  selectPlan(planId: string): Promise<ApiResult<{ ok: boolean }>>;
  products(page: number, pageSize: number): Promise<ApiResult<Paginated<Product>>>;
  requestProduct(productId: string): Promise<ApiResult<{ ok: boolean }>>;
  orders(page: number, pageSize: number): Promise<ApiResult<Paginated<Order>>>;
  finance(): Promise<ApiResult<MerchantFinance>>;
  staff(): Promise<ApiResult<StaffMember[]>>;
  updateStaffPermissions(id: string, permissions: Permission[]): Promise<ApiResult<StaffMember>>;
}

export function createMockMerchantHandler(): MockMerchantHandler {
  return {
    async onboarding(_input) {
      const db = getDb();
      const m: Merchant = {
        id: `m_${Date.now()}`, name: 'تاجر جديد', status: 'pending',
        crNumber: '0000000000', city: 'الرياض', createdAt: new Date().toISOString(),
      };
      db.merchants.push(m);
      return { data: { merchantId: m.id, status: 'pending' } };
    },
    async plans() {
      const db = getDb();
      return { data: db.plans };
    },
    async selectPlan(_planId) {
      return { data: { ok: true } };
    },
    async products(page, pageSize) {
      const db = getDb();
      // عزل بيانات التاجر: نُرجع منتجات تاجر m1 فقط (محاكاة).
      const items = db.products.filter((p) => p.merchantId === 'm1');
      const start = (page - 1) * pageSize;
      return { data: { items: items.slice(start, start + pageSize), page, pageSize, total: items.length, hasMore: false } };
    },
    async requestProduct(_productId) {
      return { data: { ok: true } };
    },
    async orders(page, pageSize) {
      const db = getDb();
      const items = db.orders.filter((o) => o.items.some((i) => i.merchantId === 'm1'));
      const start = (page - 1) * pageSize;
      return { data: { items: items.slice(start, start + pageSize), page, pageSize, total: items.length, hasMore: false } };
    },
    async finance() {
      return { data: { available: 12500, reserved: 1500, consumed: 800, dues: 3200, currency: 'SAR' } };
    },
    async staff() {
      return { data: [] };
    },
    async updateStaffPermissions(id, _permissions) {
      throw apiError(API_ERROR_CODES.NOT_FOUND, `الموظف ${id} غير موجود.`);
    },
  };
}
