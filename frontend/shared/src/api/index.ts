/**
 * عميل API الموحّد — يبدّل بين Mock و Live عبر متغيّر البيئة.
 *
 * الاستخدام في الصفحات:
 *   import { useApiClient } from '@/lib/api-client';
 *   const { products } = useApiClient();
 *   const { data } = useQuery({ queryKey: ['products'], queryFn: () => products.list(...) });
 *
 * التبديل: NEXT_PUBLIC_API_MODE=mock|live (ويب) / EXPO_PUBLIC_API_MODE (موبايل).
 */
import { HttpClient } from './client';
import { authApi } from './auth';
import { productsApi } from './products';
import { cartApi } from './cart';
import { checkoutApi, ordersApi } from './checkout';
import { addressesApi, shippingApi } from './addresses';
import { accountApi, notificationsApi, supportApi } from './account';
import { merchantApi } from './merchant';
import { adminApi } from './admin';
import { uploadsApi } from './uploads';
import { createMockClient } from '../mock';

export { HttpClient } from './client';
export { endpoints } from './endpoints';
export { apiError } from './client';
export { authApi, productsApi, cartApi, checkoutApi, ordersApi, addressesApi, shippingApi, accountApi, notificationsApi, supportApi, merchantApi, adminApi, uploadsApi };

export interface ApiClient {
  client: HttpClient;
  auth: typeof authApi;
  products: typeof productsApi;
  cart: typeof cartApi;
  checkout: typeof checkoutApi;
  orders: typeof ordersApi;
  addresses: typeof addressesApi;
  shipping: typeof shippingApi;
  account: typeof accountApi;
  notifications: typeof notificationsApi;
  support: typeof supportApi;
  merchant: typeof merchantApi;
  admin: typeof adminApi;
  uploads: typeof uploadsApi;
}

/** قراءة متغيّر بيئة بأمان (يعمل في ويب و React Native). */
function readEnv(key: string): string | undefined {
  // في Next.js و Node: process.env. في React Native: process.env أيضاً (Expo يحقنه).
  // نستخدم globalThis لتجنّب أخطاء TypeScript حين لا يكون process معرّفاً.
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.[key];
}

/** قراءة وضع API من البيئة (ويب أو موبايل). */
export function getApiMode(env: 'web' | 'mobile'): 'mock' | 'live' {
  const key = env === 'web' ? 'NEXT_PUBLIC_API_MODE' : 'EXPO_PUBLIC_API_MODE';
  return readEnv(key) === 'live' ? 'live' : 'mock';
}

export interface CreateApiClientOptions {
  env: 'web' | 'mobile';
  /** Mock: يتجاهلها. Live: عنوان الـ Backend. */
  baseUrl?: string;
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
}

/** ينشئ عميل API (mock أو live) جاهزاً للاستخدام. */
export function createApiClient(opts: CreateApiClientOptions): ApiClient {
  const mode = getApiMode(opts.env);
  // في وضع mock نستخدم mock client (شكل مختلف عن HttpClient)؛ في live نستخدم HttpClient.
  // لكلاهما نفس التواقيع (get/post/put/patch/delete) فتعمل دوال الـ api المغلّفة.
  const client =
    mode === 'mock'
      ? (createMockClient(opts) as unknown as HttpClient)
      : new HttpClient({
          baseUrl: opts.baseUrl ?? '',
          getAccessToken: opts.getAccessToken,
          onUnauthorized: opts.onUnauthorized,
        });

  return {
    client,
    auth: authApi,
    products: productsApi,
    cart: cartApi,
    checkout: checkoutApi,
    orders: ordersApi,
    addresses: addressesApi,
    shipping: shippingApi,
    account: accountApi,
    notifications: notificationsApi,
    support: supportApi,
    merchant: merchantApi,
    admin: adminApi,
    uploads: uploadsApi,
  };
}

export type { ApiResult, Paginated, ApiError, MutationOptions } from '../types/api';
