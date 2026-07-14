import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { Address } from '../types/address';
import type { MutationOptions } from '../types/api';
import type { ShippingOption } from '../types/shipping';

export interface ShippingOptionsQuery { addressId: string; cartId: string; }

export const addressesApi = {
  list: (client: HttpClient) => client.get<Address[]>(endpoints.addresses.list()),
  create: (client: HttpClient, input: Omit<Address, 'id'>, opts?: MutationOptions) =>
    client.post<Address>(endpoints.addresses.create(), input, opts),
  update: (client: HttpClient, id: string, input: Partial<Address>, opts?: MutationOptions) =>
    client.put<Address>(endpoints.addresses.update(id), input, opts),
  remove: (client: HttpClient, id: string, opts?: MutationOptions) =>
    client.delete<{ ok: boolean }>(endpoints.addresses.remove(id), opts),
};

export const shippingApi = {
  options: (client: HttpClient, query: ShippingOptionsQuery) =>
    client.get<ShippingOption[]>(endpoints.shipping.options(), {
      addressId: query.addressId,
      cartId: query.cartId,
    }),
};
