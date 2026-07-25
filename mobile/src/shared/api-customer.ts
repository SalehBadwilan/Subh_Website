/**
 * حالة العميل — Customer API.
 *
 *   Products        GET /products (نشطة فقط، مع صور ومخزون)  GET /products/:id
 *                   GET /products/search?q=
 *   Addresses       GET/POST /addresses  PUT/DELETE /addresses/:id  (JWT، بلا user_id يدوي)
 *   Notifications   GET /notifications  POST /notifications/read-all
 *   Profile         GET/PUT /users/me  (وليس /users/:id — ذاك مخصَّص للأدمن)
 *   Orders          POST /orders {shipping_address_id, items:[{product_id,quantity}]}
 *                   GET /orders  GET /orders/:id
 *   Payments        POST /payments/initiate  POST /payments/:id/confirm  GET /payments/:id
 *   السلة (سيرفر)   GET/PUT /cart — لقطة اختيارية، السلة المحلية هي مصدر الحقيقة
 *
 * كل الدوال هنا تُرجع ApiResult<T> (بلا رمي استثناءات) عبر apiFetch في api.ts.
 */
import { apiFetch, type ApiCategory, type ApiProduct, type ApiResult, type AuthUser, type Pagination } from "./api";
import type { Category, Product } from "./types";

// --- محوّلات إلى الشكل المحلي (UI shape) المستهلك من ProductCard/cart-store -----

/** درجة لون ثابتة من معرّف المنتج (UUID) — تُستخدم عندما لا توجد صورة حقيقية. */
export function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function toUiProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name_ar,
    merchant: p.merchant?.commercial_name ?? "صبح",
    categoryId: p.category_id ?? p.category?.id ?? "",
    categoryName: p.category?.name_ar ?? undefined,
    price: Number.parseFloat(String(p.price_sar)) || 0,
    rating: 0,
    reviews: 0,
    hue: hueFromId(p.id),
    description: p.description_ar ?? undefined,
    imageUrl: p.image_url ?? undefined,
    sku: p.sku,
    inStock: p.in_stock,
    stockAvailable: p.stock_available,
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  fashion: "tshirt-crew-outline",
  electronics: "cellphone",
  home: "sofa-outline",
  beauty: "star-four-points-outline",
  grocery: "silverware-fork-knife",
  kids: "baby-carriage",
  sports: "dumbbell",
  books: "book-open-outline",
};
const CATEGORY_TONES: { bg: string; fg: string }[] = [
  { bg: "#FFF1F2", fg: "#E11D48" },
  { bg: "#F0F9FF", fg: "#0284C7" },
  { bg: "#FFFBEB", fg: "#D97706" },
  { bg: "#FDF4FF", fg: "#C026D3" },
  { bg: "#ECFDF5", fg: "#059669" },
  { bg: "#FFF7ED", fg: "#EA580C" },
  { bg: "#F7FEE7", fg: "#4D7C0F" },
  { bg: "#EEF2FF", fg: "#4F46E5" },
];

/** درجة لون ثابتة (deterministic) للفئة — نفس فكرة hueFromId لكن كفهرس لوحة ألوان. */
function toneForCategory(slug: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % CATEGORY_TONES.length;
  return CATEGORY_TONES[Math.abs(h)];
}

export function toUiCategory(c: ApiCategory): Category {
  return {
    id: c.id,
    name: c.name_ar,
    icon: CATEGORY_ICONS[c.slug] ?? "shape-outline",
    tone: toneForCategory(c.slug),
    description: undefined,
  };
}

// --- Products --------------------------------------------------------------------

export type CustomerProductSort = "newest" | "price_asc" | "price_desc" | "name";

export function getProducts(opts: {
  categoryId?: string;
  q?: string;
  sort?: CustomerProductSort;
  page?: number;
  limit?: number;
} = {}): Promise<ApiResult<ApiProduct[]>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 20),
  });
  if (opts.categoryId) params.set("category_id", opts.categoryId);
  if (opts.q) params.set("q", opts.q);
  if (opts.sort) params.set("sort", opts.sort);
  return apiFetch<ApiProduct[]>(`/products?${params}`);
}

export function getProductById(id: string): Promise<ApiResult<ApiProduct>> {
  return apiFetch<ApiProduct>(`/products/${id}`);
}

/**
 * فلترة نصية على العميل — الباك إند لا يوفّر بحثًا نصيًا حرًّا للمنتجات
 * (هذا دور `aiProductSearch`)، لذا يجلب البحث الحرفي الكتالوج مرّة ويُفلتر
 * محليًا بالاسم/الوصف/SKU — مطابقٌ تمامًا لسلوك customer.search في الويب.
 */
export function filterProductsByText(products: ApiProduct[], q: string): ApiProduct[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return products;
  return products.filter(
    (p) =>
      p.name_ar.toLowerCase().includes(needle) ||
      (p.description_ar ?? "").toLowerCase().includes(needle) ||
      p.sku.toLowerCase().includes(needle),
  );
}

// --- Addresses ---------------------------------------------------------------------

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

export function getAddresses(): Promise<ApiResult<ApiAddress[]>> {
  return apiFetch<ApiAddress[]>("/addresses?limit=100");
}

export function createAddress(input: AddressInput): Promise<ApiResult<ApiAddress>> {
  return apiFetch<ApiAddress>("/addresses", { method: "POST", body: input });
}

export function updateAddress(id: string, input: Partial<AddressInput>): Promise<ApiResult<ApiAddress>> {
  return apiFetch<ApiAddress>(`/addresses/${id}`, { method: "PUT", body: input });
}

export function deleteAddress(id: string): Promise<ApiResult<unknown>> {
  return apiFetch<unknown>(`/addresses/${id}`, { method: "DELETE" });
}

// --- Notifications -------------------------------------------------------------------

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

export function getNotifications(): Promise<ApiResult<ApiNotification[]>> {
  return apiFetch<ApiNotification[]>("/notifications?limit=100");
}

export function markAllNotificationsRead(): Promise<ApiResult<unknown>> {
  return apiFetch<unknown>("/notifications/read-all", { method: "POST" });
}

// --- Support tickets (الدعم) -----------------------------------------------------------

/** فئات التذكرة المسموحة (مطابقة لتحقّق الباك إند في customer/routes/supportTickets.js). */
export type SupportCategory = "general" | "billing" | "delivery" | "product" | "returns" | "other";

export const supportCategoryLabels: Record<SupportCategory, string> = {
  general: "استفسار عام",
  billing: "الفواتير والدفع",
  delivery: "التوصيل",
  product: "المنتجات",
  returns: "الإرجاع والاسترداد",
  other: "أخرى",
};

export type ApiSupportTicket = {
  id: string;
  subject_ar: string;
  message_ar: string;
  order_id: string | null;
  category: SupportCategory;
  status: string;
  created_at: string;
};

/**
 * POST /support/tickets — تذكرة دعم للمستخدم الحالي (مصادَق، JWT).
 * order_id اختياري ويجب أن يخص المستخدم نفسه (يتحقق الباك إند).
 */
export function createSupportTicket(input: {
  subject_ar: string;
  message_ar: string;
  category?: SupportCategory;
  order_id?: string;
}): Promise<ApiResult<ApiSupportTicket>> {
  return apiFetch<ApiSupportTicket>("/support/tickets", { method: "POST", body: input });
}

// --- Profile ---------------------------------------------------------------------------

/**
 * ملف المستخدم — عبر `/users/me` (وليس `/users/:id`، المخصَّص للأدمن حصرًا
 * عبر `requireFullAdmin`). لا يتضمن `merchant_id`/`roles` — هذان يصلان فقط
 * من verify-otp ويبقيان في auth-store دون تغيير عند تحديث الملف الشخصي.
 */
export type ApiUserProfile = {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_guest: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
};

export function getMyProfile(): Promise<ApiResult<ApiUserProfile>> {
  return apiFetch<ApiUserProfile>("/users/me");
}

export function updateMyProfile(
  input: Partial<{ full_name: string; email: string }>,
): Promise<ApiResult<ApiUserProfile>> {
  return apiFetch<ApiUserProfile>("/users/me", { method: "PUT", body: input });
}

// --- سلة السيرفر (لقطة اختيارية — غير إلزامية للشراء) -----------------------------------

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

export function getServerCart(): Promise<ApiResult<ServerCart>> {
  return apiFetch<ServerCart>("/cart");
}

export function saveServerCart(
  items: { product_id: string; quantity: number }[],
): Promise<ApiResult<ServerCart>> {
  return apiFetch<ServerCart>("/cart", { method: "PUT", body: { items } });
}

// --- Orders --------------------------------------------------------------------------

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
  created_at?: string;
};

export function getOrders(): Promise<ApiResult<ApiOrder[]>> {
  return apiFetch<ApiOrder[]>("/orders?limit=50");
}

export function getOrder(id: string): Promise<ApiResult<ApiOrder>> {
  return apiFetch<ApiOrder>(`/orders/${id}`);
}

/**
 * POST /orders — الباك إند يتحقق من العنوان والمخزون ذريًّا ويحل التاجر
 * المخوَّل لكل سطر تلقائيًا؛ لا تُرسل merchant_id من العميل.
 */
export function placeOrder(input: {
  shippingAddressId: string;
  items: { product_id: string; quantity: number }[];
  notes?: string;
}): Promise<ApiResult<ApiOrder>> {
  return apiFetch<ApiOrder>("/orders", {
    method: "POST",
    body: { shipping_address_id: input.shippingAddressId, items: input.items, notes: input.notes },
  });
}

// --- Payments (بوابة اختبار) -----------------------------------------------------------

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

export function initiatePayment(
  orderId: string,
  method: import("./types").PaymentMethodKey,
): Promise<ApiResult<{ payment: ApiPayment; intent: PaymentIntent }>> {
  return apiFetch<{ payment: ApiPayment; intent: PaymentIntent }>("/payments/initiate", {
    method: "POST",
    body: { order_id: orderId, method },
  });
}

/** last4:"0002" يحاكي بطاقة مرفوضة (اتفاقية مزوّد الاختبار)، غيرها ينجح فورًا. */
export function confirmPayment(
  paymentId: string,
  source?: { last4?: string },
): Promise<ApiResult<{ payment: ApiPayment; status: string; already_paid: boolean }>> {
  return apiFetch<{ payment: ApiPayment; status: string; already_paid: boolean }>(
    `/payments/${paymentId}/confirm`,
    { method: "POST", body: { source } },
  );
}

export function getPayment(id: string): Promise<ApiResult<ApiPayment>> {
  return apiFetch<ApiPayment>(`/payments/${id}`);
}

// --- Merchant application (طلب الانضمام كتاجر) -----------------------------------------

export type ApiMerchantApplication = {
  id: string;
  user_id: string;
  commercial_name: string;
  commercial_registration_no: string;
  iban: string;
  vat_number: string | null;
  notes: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

export const applicationStatusLabels: Record<ApiMerchantApplication["status"], string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

/** بلا user_id — الباك إند يستخدم JWT دائمًا لتحديد صاحب الطلب. */
export function getMyApplications(): Promise<ApiResult<ApiMerchantApplication[]>> {
  return apiFetch<ApiMerchantApplication[]>("/merchant-applications?limit=20");
}

export function submitMerchantApplication(input: {
  commercial_name: string;
  commercial_registration_no: string;
  iban: string;
  vat_number?: string;
  notes?: string;
}): Promise<ApiResult<ApiMerchantApplication>> {
  return apiFetch<ApiMerchantApplication>("/merchant-applications", { method: "POST", body: input });
}
