import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { Merchant, MerchantStatus } from '../types/merchant';
import type { Product } from '../types/product';
import type { Order, OrderStatus } from '../types/order';
import type { StockLevel, InventoryMovement } from '../types/inventory';
import type { AuditLogEntry } from '../types/audit';
import type { Paginated, MutationOptions } from '../types/api';
import type { Role } from '../types/user';

export interface AdminOverview {
  kpis: Record<string, number>;
  alerts: { id: string; severity: 'low' | 'medium' | 'high'; message: string }[];
  lowStock: StockLevel[];
  pendingTasks: { id: string; label: string; type: string }[];
}

export const adminApi = {
  overview: (client: HttpClient) => client.get<AdminOverview>(endpoints.admin.overview()),

  merchants: (client: HttpClient, page = 1, pageSize = 20) =>
    client.get<Paginated<Merchant>>(endpoints.admin.merchants(), { page, pageSize }),
  setMerchantStatus: (client: HttpClient, id: string, status: MerchantStatus, opts?: MutationOptions) =>
    client.patch<Merchant>(endpoints.admin.merchantStatus(id), { status }, opts),

  products: (client: HttpClient, page = 1, pageSize = 20) =>
    client.get<Paginated<Product>>(endpoints.admin.products(), { page, pageSize }),

  inventory: (client: HttpClient) => client.get<StockLevel[]>(endpoints.admin.inventory()),
  inventoryMovements: (client: HttpClient, productId: string) =>
    client.get<InventoryMovement[]>(endpoints.admin.inventory(), { productId }),

  orders: (client: HttpClient, page = 1, pageSize = 20) =>
    client.get<Paginated<Order>>(endpoints.admin.orders(), { page, pageSize }),
  setOrderStatus: (client: HttpClient, id: string, status: OrderStatus, trackingNumber?: string, opts?: MutationOptions) =>
    client.patch<Order>(endpoints.admin.orderStatus(id), { status, trackingNumber }, opts),

  payments: (client: HttpClient) => client.get<unknown[]>(endpoints.admin.payments()),
  refund: (client: HttpClient, orderId: string, amount: number, type: 'partial' | 'full', opts?: MutationOptions) =>
    client.post<{ ok: boolean }>(endpoints.admin.refunds(), { orderId, amount, type }, opts),

  capital: (client: HttpClient) => client.get<unknown>(endpoints.admin.capital()),

  users: (client: HttpClient, page = 1, pageSize = 20) =>
    client.get<Paginated<unknown>>(endpoints.admin.users(), { page, pageSize }),
  setUserRoles: (client: HttpClient, id: string, roles: Role[], opts?: MutationOptions) =>
    client.patch<{ ok: boolean }>(endpoints.admin.userRoles(id), { roles }, opts),

  auditLog: (client: HttpClient, page = 1, pageSize = 50) =>
    client.get<Paginated<AuditLogEntry>>(endpoints.admin.auditLog(), { page, pageSize }),
  reports: (client: HttpClient) => client.get<unknown>(endpoints.admin.reports()),
};
