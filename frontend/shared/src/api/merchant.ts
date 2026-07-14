import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { Merchant, MerchantOnboardingInput } from '../types/merchant';
import type { Plan } from '../types/plan';
import type { Product } from '../types/product';
import type { Order } from '../types/order';
import type { MerchantFinance, Transaction } from '../types/finance';
import type { StaffMember, Permission } from '../types/staff';
import type { Paginated, MutationOptions } from '../types/api';

export const merchantApi = {
  onboarding: (client: HttpClient, input: MerchantOnboardingInput, opts?: MutationOptions) =>
    client.post<{ merchantId: string; status: 'pending' }>(endpoints.merchant.onboarding(), input, opts),

  plans: (client: HttpClient) => client.get<Plan[]>(endpoints.merchant.plans()),
  selectPlan: (client: HttpClient, planId: string, opts?: MutationOptions) =>
    client.post<{ ok: boolean }>(endpoints.merchant.selectPlan(), { planId }, opts),

  products: (client: HttpClient, page = 1, pageSize = 20) =>
    client.get<Paginated<Product>>(endpoints.merchant.products(), { page, pageSize }),
  requestProduct: (client: HttpClient, productId: string, opts?: MutationOptions) =>
    client.post<{ ok: boolean }>(endpoints.merchant.requestProduct(), { productId }, opts),

  orders: (client: HttpClient, page = 1, pageSize = 20) =>
    client.get<Paginated<Order>>(endpoints.merchant.orders(), { page, pageSize }),

  finance: (client: HttpClient) => client.get<MerchantFinance>(endpoints.merchant.finance()),
  reports: (client: HttpClient) => client.get<unknown>(endpoints.merchant.reports()),

  staff: (client: HttpClient) => client.get<StaffMember[]>(endpoints.merchant.staff()),
  addStaff: (client: HttpClient, input: Omit<StaffMember, 'id' | 'createdAt'>, opts?: MutationOptions) =>
    client.post<StaffMember>(endpoints.merchant.staff(), input, opts),
  updateStaffPermissions: (
    client: HttpClient,
    id: string,
    permissions: Permission[],
    opts?: MutationOptions,
  ) => client.patch<StaffMember>(endpoints.merchant.updateStaffPermissions(id), { permissions }, opts),
};

export type { Merchant, Transaction };
