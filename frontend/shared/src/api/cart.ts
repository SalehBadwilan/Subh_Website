import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { Cart, CartQuote, CartItem } from '../types/cart';
import type { MutationOptions } from '../types/api';

export interface AddCartItemInput { productId: string; quantity: number; }
export interface UpdateCartItemInput { quantity: number; }
export interface QuoteInput { addressId: string; }

export const cartApi = {
  get: (client: HttpClient) => client.get<Cart>(endpoints.cart.get()),

  addItem: (client: HttpClient, input: AddCartItemInput, opts?: MutationOptions) =>
    client.post<Cart>(endpoints.cart.addItem(), input, opts),

  updateItem: (client: HttpClient, id: string, input: UpdateCartItemInput, opts?: MutationOptions) =>
    client.put<Cart>(endpoints.cart.updateItem(id), input, opts),

  removeItem: (client: HttpClient, id: string, opts?: MutationOptions) =>
    client.delete<Cart>(endpoints.cart.removeItem(id), opts),

  quote: (client: HttpClient, input: QuoteInput, opts?: MutationOptions) =>
    client.post<CartQuote>(endpoints.cart.quote(), input, opts),
};

// إعادة تصدير للأنواع الشائعة
export type { CartItem };
