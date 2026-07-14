/**
 * عميل Mock — يلبّي نفس واجهة HttpClient (get/post/put/patch/delete) لكنه
 * يوجّه الطلبات للمعالجات المحلية. يعمل في المتصفح وReact Native دون فرق.
 *
 * التبديل شفاف: الصفحات تستهلك `productsApi.list(client, ...)` دون أن تعرف
 * إن كان client حقيقياً أم وهمياً.
 */
import type { ApiResult, MutationOptions } from '../types/api';
import { getDb } from './db';
import { createMockAuthHandler } from './handlers/auth';
import { createMockProductsHandler } from './handlers/products';
import { createMockCartHandler } from './handlers/cart';
import { createMockCheckoutHandler } from './handlers/checkout';
import { createMockAddressesHandler } from './handlers/addresses';
import { createMockMerchantHandler } from './handlers/merchant';
import type { CreateApiClientOptions } from '../api';

type Query = Record<string, string | number | boolean | undefined>;

/** محاكاة تأخير الشبكة لاختبار حالات loading. */
const NETWORK_DELAY = 200;
const delay = (ms = NETWORK_DELAY) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * يبني كائناً بنفس تواقيع HttpClient لكنه يخدم الطلبات محلياً.
 * يُعاد بدل `new HttpClient(...)` في وضع mock.
 */
export function createMockClient(opts: CreateApiClientOptions) {
  const auth = createMockAuthHandler();
  const products = createMockProductsHandler();
  const cart = createMockCartHandler();
  const checkout = createMockCheckoutHandler();
  const addresses = createMockAddressesHandler();
  const merchant = createMockMerchantHandler();

  getDb(); // تهيئة

  async function route<T>(method: string, path: string, payload?: unknown): Promise<ApiResult<T>> {
    // فشل الدفع عبر ?fail=1 (محاكاة بوابة الدفع).
    const fail =
      typeof window !== 'undefined' &&
      typeof window.location !== 'undefined' &&
      new URLSearchParams(window.location.search).has('fail');

    // ---- auth ----
    if (path === '/auth/otp/request' && method === 'POST')
      return auth.requestOtp((payload as { phone: string }).phone) as Promise<ApiResult<T>>;
    if (path === '/auth/otp/verify' && method === 'POST') {
      const b = payload as { attemptId: string; code: string };
      return auth.verifyOtp(b.attemptId, b.code) as Promise<ApiResult<T>>;
    }
    if (path === '/auth/me' && method === 'GET')
      return auth.me(opts.getAccessToken() ?? '') as Promise<ApiResult<T>>;
    if (path === '/auth/logout') return { data: { ok: true } as T };

    // ---- products ----
    if (path === '/products' && method === 'GET')
      return products.list((payload as Query) ?? {}) as Promise<ApiResult<T>>;
    if (path.startsWith('/products/') && method === 'GET') {
      const slug = path.split('/')[2]!;
      return products.detail(slug) as Promise<ApiResult<T>>;
    }
    if (path === '/categories' && method === 'GET') return products.categories() as Promise<ApiResult<T>>;
    if (path.startsWith('/categories/') && method === 'GET') {
      const slug = path.split('/')[2]!;
      return products.categoryDetail(slug) as Promise<ApiResult<T>>;
    }

    // ---- cart ----
    if (path === '/cart' && method === 'GET') return cart.get() as Promise<ApiResult<T>>;
    if (path === '/cart/items' && method === 'POST') {
      const b = payload as { productId: string; quantity: number };
      return cart.addItem(b.productId, b.quantity) as Promise<ApiResult<T>>;
    }
    if (path.startsWith('/cart/items/') && method === 'PUT') {
      const id = path.split('/')[3]!;
      return cart.updateItem(id, (payload as { quantity: number }).quantity) as Promise<ApiResult<T>>;
    }
    if (path.startsWith('/cart/items/') && method === 'DELETE') {
      const id = path.split('/')[3]!;
      return cart.removeItem(id) as Promise<ApiResult<T>>;
    }
    if (path === '/cart/quote' && method === 'POST')
      return cart.quote((payload as { addressId: string }).addressId) as Promise<ApiResult<T>>;

    // ---- checkout / orders ----
    if (path === '/checkout/intent' && method === 'POST')
      return checkout.intent((payload as { cartId: string }).cartId, fail) as Promise<ApiResult<T>>;
    if (path === '/checkout/confirm' && method === 'POST')
      return checkout.confirm(payload as { intentId: string; addressId: string; shippingMethodId: string; idempotencyKey: string }, fail) as Promise<ApiResult<T>>;
    if (path === '/orders' && method === 'GET') return checkout.listOrders() as Promise<ApiResult<T>>;
    if (path.startsWith('/orders/') && method === 'GET' && !path.includes('/cancel') && !path.includes('/return')) {
      const id = path.split('/')[2]!;
      return checkout.getOrder(id) as Promise<ApiResult<T>>;
    }
    if (path.endsWith('/cancel') && method === 'POST') {
      const id = path.split('/')[2]!;
      return checkout.cancelOrder(id) as Promise<ApiResult<T>>;
    }

    // ---- addresses / shipping ----
    if (path === '/addresses' && method === 'GET') return addresses.list() as Promise<ApiResult<T>>;
    if (path === '/shipping/options' && method === 'GET') return addresses.shippingOptions() as Promise<ApiResult<T>>;

    // ---- merchant ----
    if (path === '/merchant/plans' && method === 'GET') return merchant.plans() as Promise<ApiResult<T>>;
    if (path === '/merchant/products' && method === 'GET') return merchant.products(1, 20) as Promise<ApiResult<T>>;
    if (path === '/merchant/orders' && method === 'GET') return merchant.orders(1, 20) as Promise<ApiResult<T>>;
    if (path === '/merchant/finance' && method === 'GET') return merchant.finance() as Promise<ApiResult<T>>;

    throw { code: 'NOT_FOUND', message: `المسار غير مدعوم في Mock: ${method} ${path}` };
  }

  return {
    get: <T>(path: string, query?: Query): Promise<ApiResult<T>> => delay().then(() => route<T>('GET', path, query)),
    post: <T>(path: string, body?: unknown, _mutation?: MutationOptions): Promise<ApiResult<T>> => delay().then(() => route<T>('POST', path, body)),
    put: <T>(path: string, body?: unknown, _mutation?: MutationOptions): Promise<ApiResult<T>> => delay().then(() => route<T>('PUT', path, body)),
    patch: <T>(path: string, body?: unknown, _mutation?: MutationOptions): Promise<ApiResult<T>> => delay().then(() => route<T>('PATCH', path, body)),
    delete: <T>(path: string, _mutation?: MutationOptions): Promise<ApiResult<T>> => delay().then(() => route<T>('DELETE', path)),
  };
}
