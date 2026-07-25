/**
 * حالة العميل — Customer API.
 *
 * Wraps the backend's Stage-1 customer module (real composite routes):
 *
 *   Products        GET /api/products                (public, active only,
 *                                                     with images + stock)
 *                   GET /api/products/:id
 *                   GET /api/products/search?q=
 *   Cart (server)   GET /api/cart , PUT /api/cart    (authenticated)
 *   Orders          POST /api/orders {shipping_address_id, items[]}
 *                   GET /api/orders , GET /api/orders/:id   (authenticated,
 *                   scoped to the JWT user — no user_id params needed)
 *   Payments        POST /api/payments/initiate {order_id, method}
 *                   POST /api/payments/:id/confirm {source}
 *                   GET  /api/payments/:id
 *   Addresses       GET/POST /api/addresses, PUT/DELETE /api/addresses/:id
 *   Notifications   GET /api/notifications, POST /api/notifications/read-all
 *   Profile         GET/PUT /api/users/:id
 *
 * The JWT is attached automatically by apiFetch(); the backend scopes every
 * cart/order/payment query to the authenticated user.
 */
import { apiFetch, type ApiProduct, type AuthUser, type Pagination } from "./api";

// --- Products ----------------------------------------------------------------

export type CustomerProductSort = "newest" | "price_asc" | "price_desc" | "name";

export function getProducts({
  categoryId,
  q,
  sort,
  page = 1,
  limit = 20,
}: {
  categoryId?: string;
  q?: string;
  sort?: CustomerProductSort;
  page?: number;
  limit?: number;
} = {}): Promise<{ products: ApiProduct[]; pagination?: Pagination }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (categoryId) params.set("category_id", categoryId);
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  return apiFetch<ApiProduct[]>(`/products?${params}`).then((r) => ({
    products: r.data,
    pagination: r.pagination,
  }));
}

/** GET /api/products/:id — single ACTIVE product with images + stock. */
export function getProductById(id: string): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/products/${id}`).then((r) => r.data);
}

/** GET /api/products/search — dedicated keyword search (q >= 2 chars). */
export function searchProducts(
  q: string,
  { categoryId, page = 1, limit = 20 }: { categoryId?: string; page?: number; limit?: number } = {},
): Promise<{ products: ApiProduct[]; pagination?: Pagination }> {
  const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  if (categoryId) params.set("category_id", categoryId);
  return apiFetch<ApiProduct[]>(`/products/search?${params}`).then((r) => ({
    products: r.data,
    pagination: r.pagination,
  }));
}

// --- Addresses ---------------------------------------------------------------

export type ApiAddress = {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postal_code: string | null;
  is_default: boolean;
  created_at?: string;
};

export type AddressInput = {
  recipient_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code?: string;
  is_default?: boolean;
};

/** Authenticated: the backend scopes to the JWT user, no user_id needed. */
export function getAddresses(_userId?: string): Promise<ApiAddress[]> {
  return apiFetch<ApiAddress[]>("/addresses?limit=100").then((r) => r.data);
}

export function createAddress(
  _userId: string | undefined,
  input: AddressInput,
): Promise<ApiAddress> {
  return apiFetch<ApiAddress>("/addresses", { method: "POST", body: input }).then((r) => r.data);
}

export function updateAddress(id: string, input: Partial<AddressInput>): Promise<ApiAddress> {
  return apiFetch<ApiAddress>(`/addresses/${id}`, { method: "PUT", body: input }).then(
    (r) => r.data,
  );
}

export function deleteAddress(id: string): Promise<void> {
  return apiFetch<unknown>(`/addresses/${id}`, { method: "DELETE" }).then(() => undefined);
}

// --- Notifications -----------------------------------------------------------

export type ApiNotification = {
  id: string;
  user_id: string;
  title_ar: string;
  body_ar: string;
  channel: "in_app" | "sms" | "email" | "push";
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export function getNotifications(_userId?: string): Promise<ApiNotification[]> {
  return apiFetch<ApiNotification[]>("/notifications?limit=100").then((r) => r.data);
}

/** POST /api/notifications/read-all — marks every unread notification read. */
export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<unknown>("/notifications/read-all", { method: "POST" }).then(() => undefined);
}

// --- Profile -----------------------------------------------------------------

export function getUserById(id: string): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/users/${id}`).then((r) => r.data);
}

export function updateUser(
  id: string,
  input: Partial<{ full_name: string; email: string }>,
): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/users/${id}`, { method: "PUT", body: input }).then((r) => r.data);
}

// --- Server cart -------------------------------------------------------------

export type ServerCartItem = {
  id: string;
  product_id: string | null;
  package_id: string | null;
  merchant_id: string;
  quantity: number;
  unit_price_sar: number;
  line_total_sar: number;
};

export type ServerCart = {
  id: string;
  status: string;
  currency: string;
  items: ServerCartItem[];
  subtotal_sar: number;
  items_count: number;
};

export function getServerCart(): Promise<ServerCart> {
  return apiFetch<ServerCart>("/cart").then((r) => r.data);
}

/** Full replacement of the server cart's contents (authenticated). */
export function saveServerCart(
  items: { product_id: string; quantity: number }[],
): Promise<ServerCart> {
  return apiFetch<ServerCart>("/cart", { method: "PUT", body: { items } }).then((r) => r.data);
}

// --- Orders ------------------------------------------------------------------

export type ApiOrderItem = {
  id: string;
  product_id: string | null;
  package_id: string | null;
  merchant_id: string;
  name_snapshot_ar: string;
  sku_snapshot: string;
  quantity: number;
  unit_price_sar: number;
  line_total_sar: number;
  image_url: string | null;
};

export type ApiOrder = {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotal_sar: number;
  discount_sar: number;
  shipping_sar: number;
  vat_sar: number;
  total_sar: number;
  notes_ar: string | null;
  placed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  shipping_address_id: string;
  items: ApiOrderItem[];
  /** Present on merchant-portal orders only (GET /api/merchant/orders). */
  customer?: { id: string; full_name: string; phone: string } | null;
  created_at?: string;
};

export function getOrders(): Promise<{ orders: ApiOrder[]; pagination?: Pagination }> {
  return apiFetch<ApiOrder[]>("/orders?limit=50").then((r) => ({
    orders: r.data,
    pagination: r.pagination,
  }));
}

export function getOrder(id: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/orders/${id}`).then((r) => r.data);
}

/**
 * POST /api/orders — atomic checkout: the backend validates the address,
 * merchant authorization and STOCK, decrements inventory, snapshots the lines
 * and returns the order with status 'pending_payment'.
 */
export function placeOrder({
  shippingAddressId,
  items,
  notes,
}: {
  shippingAddressId: string;
  // Only product + quantity: the backend resolves the authorized merchant per
  // line from merchant_products, so the client never sends merchant_id.
  items: { product_id: string; quantity: number }[];
  notes?: string;
}): Promise<ApiOrder> {
  return apiFetch<ApiOrder>("/orders", {
    method: "POST",
    body: { shipping_address_id: shippingAddressId, items, notes },
  }).then((r) => r.data);
}

// --- Payments (gateway) ------------------------------------------------------

export type ApiPayment = {
  id: string;
  order_id: string;
  provider: string;
  provider_reference: string | null;
  method: string;
  amount_sar: number;
  currency: string;
  status: "initiated" | "authorized" | "captured" | "failed" | "refunded" | "disputed";
  captured_at: string | null;
  created_at: string;
};

export type PaymentIntent = {
  provider: string;
  provider_reference: string | null;
  client_secret: string | null;
  status: string;
  publishable_key: string | null;
};

export type PaymentMethodKey = "card" | "mada" | "apple_pay" | "stc_pay";

/** POST /api/payments/initiate — starts a payment for a pending order. */
export function initiatePayment(
  orderId: string,
  method: PaymentMethodKey = "card",
): Promise<{ payment: ApiPayment; intent: PaymentIntent }> {
  return apiFetch<{ payment: ApiPayment; intent: PaymentIntent }>("/payments/initiate", {
    method: "POST",
    body: { order_id: orderId, method },
  }).then((r) => r.data);
}

/**
 * POST /api/payments/:id/confirm — client-side confirmation.
 * Test provider convention: source.last4 === '0002' simulates a DECLINE;
 * anything else captures the payment and finalizes the order (paid + invoice
 * + notification), all server-side.
 */
export function confirmPayment(
  paymentId: string,
  source?: { last4?: string },
): Promise<{ payment: ApiPayment; status: string; already_paid: boolean }> {
  return apiFetch<{ payment: ApiPayment; status: string; already_paid: boolean }>(
    `/payments/${paymentId}/confirm`,
    { method: "POST", body: { source } },
  ).then((r) => r.data);
}

export function getPayment(id: string): Promise<ApiPayment> {
  return apiFetch<ApiPayment>(`/payments/${id}`).then((r) => r.data);
}

// --- Status labels -----------------------------------------------------------

/** Human-readable Arabic labels for backend order statuses. */
export const orderStatusLabels: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  paid: "مدفوع",
  preparing: "قيد التجهيز",
  processing: "قيد التجهيز",
  ready_to_ship: "جاهز للشحن",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  returned: "مرتجع",
  refunded: "مسترد",
};

export const orderStatusTone: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-sky-50 text-sky-700 border-sky-200",
  preparing: "bg-violet-50 text-violet-700 border-violet-200",
  processing: "bg-violet-50 text-violet-700 border-violet-200",
  ready_to_ship: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  returned: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-muted text-foreground border-border",
};

export const paymentStatusLabels: Record<string, string> = {
  initiated: "بدأت العملية",
  authorized: "مُصرَّح بها",
  captured: "تم الدفع",
  failed: "فشل الدفع",
  refunded: "مستردة",
  disputed: "متنازع عليها",
};
