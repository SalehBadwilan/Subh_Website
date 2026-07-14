import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { Order, ReturnRequest } from '../types/order';
import type { PaymentIntent } from '../types/payment';
import type { Paginated, MutationOptions } from '../types/api';
import type { OrderStatus } from '../types/order';

export interface CheckoutIntentInput { cartId: string; }
export interface CheckoutConfirmInput {
  intentId: string;
  addressId: string;
  shippingMethodId: string;
  idempotencyKey: string;
}
export interface ReturnInput { items: { id: string; quantity: number }[]; reason: string; }
export interface OrderListQuery { status?: OrderStatus; page?: number; pageSize?: number; }

export const checkoutApi = {
  intent: (client: HttpClient, input: CheckoutIntentInput) =>
    client.post<PaymentIntent>(endpoints.checkout.intent(), input),

  /** ⚠️ إلزامي: idempotencyKey في الـ input + opts معاً. */
  confirm: (client: HttpClient, input: CheckoutConfirmInput, opts?: MutationOptions) =>
    client.post<Order>(
      endpoints.checkout.confirm(),
      input,
      { ...opts, idempotencyKey: input.idempotencyKey ?? opts?.idempotencyKey },
    ),
};

export const ordersApi = {
  list: (client: HttpClient, query: OrderListQuery = {}) =>
    client.get<Paginated<Order>>(endpoints.orders.list(), {
      status: query.status,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }),

  detail: (client: HttpClient, id: string) =>
    client.get<Order>(endpoints.orders.detail(id)),

  cancel: (client: HttpClient, id: string, opts?: MutationOptions) =>
    client.post<Order>(endpoints.orders.cancel(id), undefined, opts),

  return: (client: HttpClient, id: string, input: ReturnInput, opts?: MutationOptions) =>
    client.post<ReturnRequest>(endpoints.orders.return(id), input, opts),
};
