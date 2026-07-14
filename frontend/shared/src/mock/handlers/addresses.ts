import { getDb } from '../db';
import { DEFAULT_SHIPPING_OPTIONS } from '../../utils/shipping';
import type { Address } from '../../types/address';
import type { ShippingOption } from '../../types/shipping';
import type { ApiResult, ApiError } from '../../types/api';
import { API_ERROR_CODES } from '../../constants/config';

function apiError(code: string, message: string): ApiError {
  return { code, message };
}

export interface MockAddressesHandler {
  list(): Promise<ApiResult<Address[]>>;
  create(input: Omit<Address, 'id'>): Promise<ApiResult<Address>>;
  update(id: string, input: Partial<Address>): Promise<ApiResult<Address>>;
  remove(id: string): Promise<ApiResult<{ ok: boolean }>>;
  shippingOptions(): Promise<ApiResult<ShippingOption[]>>;
}

export function createMockAddressesHandler(): MockAddressesHandler {
  return {
    async list() {
      const db = getDb();
      return { data: db.addresses };
    },
    async create(input) {
      const db = getDb();
      const addr: Address = { ...input, id: `a_${Date.now()}` };
      db.addresses.push(addr);
      return { data: addr };
    },
    async update(id, input) {
      const db = getDb();
      const addr = db.addresses.find((a) => a.id === id);
      if (!addr) throw apiError(API_ERROR_CODES.NOT_FOUND, 'العنوان غير موجود.');
      Object.assign(addr, input);
      return { data: addr };
    },
    async remove(id) {
      const db = getDb();
      db.addresses = db.addresses.filter((a) => a.id !== id);
      return { data: { ok: true } };
    },
    async shippingOptions() {
      return { data: DEFAULT_SHIPPING_OPTIONS };
    },
  };
}
