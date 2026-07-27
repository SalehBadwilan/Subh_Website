/**
 * Subh backend API client — CORE (mobile app).
 *
 * This file holds the shared plumbing used by BOTH portals:
 *   - apiFetch(): single choke point with client-side timeout + normalized errors
 *   - auth (phone OTP): POST /api/auth/otp/request , POST /api/auth/otp/verify
 *   - catalog categories: GET /api/categories (used by customer + AI search)
 *   - AI semantic search: POST /api/ai/product-search
 *
 * Per-case endpoint functions live in their own files so each حالة stays
 * readable on its own:
 *   - api-customer.ts → كل ما يخص العميل (منتجات، عناوين، إشعارات، طلبات…)
 *   - api-merchant.ts → كل ما يخص التاجر (متجره، منتجاته، طلباته، اشتراكه…)
 */
import { getToken } from "@/lib/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://subhmarket-production-c48b.up.railway.app/api";

/** Default client-side timeout. AI calls get a longer budget (backend allows the provider up to 15s). */
const DEFAULT_TIMEOUT_MS = 15_000;
const AI_TIMEOUT_MS = 25_000;

/**
 * Machine-readable failure reasons.
 * - Backend AI codes pass through as-is: 'timeout' | 'not_configured' | 'provider_error' | 'parse_error'
 * - 'client_timeout' → our own AbortController fired (server unreachable or too slow)
 * - 'network'        → fetch itself failed (server down, DNS, CORS…)
 * - 'validation'     → 422 from express-validator
 * - 'http_error'     → any other non-2xx
 */
export type ApiErrorCode =
  | "timeout"
  | "not_configured"
  | "provider_error"
  | "parse_error"
  | "client_timeout"
  | "network"
  | "validation"
  | "http_error";

export class ApiRequestError extends Error {
  status: number;
  code: ApiErrorCode;
  details: unknown;

  constructor(
    message: string,
    {
      status = 0,
      code = "http_error",
      details = null,
    }: { status?: number; code?: ApiErrorCode; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the failure is a timeout — ours or the AI provider's. */
  get isTimeout(): boolean {
    return this.code === "timeout" || this.code === "client_timeout";
  }
}

/** List endpoints return `pagination` as a SIBLING of `data`, not nested. */
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
  error?: string;
  code?: string;
  details?: unknown;
};

export async function apiFetch<T>(
  path: string,
  {
    method = "GET",
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<{ data: T; message?: string; pagination?: Pagination }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const token = getToken();

  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiRequestError("انتهت مهلة الاتصال بالخادم، تأكد من تشغيله وحاول مجددًا.", {
        code: "client_timeout",
      });
    }

    throw new ApiRequestError("تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وأن الخادم يعمل.", {
      code: "network",
    });
  } finally {
    clearTimeout(timer);
  }

  let json: ApiEnvelope<T> | null = null;

  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    /* ignore */
  }

  if (!response.ok || !json?.ok) {
    const backendCode = json?.code;

    const code: ApiErrorCode =
      backendCode === "timeout" ||
      backendCode === "not_configured" ||
      backendCode === "provider_error" ||
      backendCode === "parse_error"
        ? backendCode
        : response.status === 422
          ? "validation"
          : "http_error";

    throw new ApiRequestError(json?.error || `فشل الطلب (HTTP ${response.status})`, {
      status: response.status,
      code,
      details: json?.details ?? null,
    });
  }

  return {
    data: json.data,
    message: json.message,
    pagination: json.pagination,
  };
}

// --- Auth: phone OTP ---------------------------------------------------------

export type AuthUser = {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_guest: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;

  // أضف هذا السطر
  merchant_id?: string | null;

  /** Role slugs resolved client-side after login (admin / merchant / …). */
  roles?: string[];
};

export type RequestOtpResult = {
  phone: string;
  expires_in_seconds: number;
  /** Present ONLY when the backend runs in development mode. */
  devOtp?: string;
};

export function requestOtp(phone: string): Promise<RequestOtpResult> {
  return apiFetch<RequestOtpResult>("/auth/otp/request", {
    method: "POST",
    body: { phone },
  }).then((r) => r.data);
}

export type VerifyOtpResult = {
  user: AuthUser;
  token: string;
  token_expires_in: string;
};

export function verifyOtp(
  phone: string,
  otp: string,
): Promise<{ data: VerifyOtpResult; message?: string }> {
  return apiFetch<VerifyOtpResult>("/auth/otp/verify", {
    method: "POST",
    body: { phone, otp },
  });
}

// --- Catalog: categories -----------------------------------------------------

export type ApiCategory = {
  id: string;
  slug: string;
  name_ar: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export function getCategories(): Promise<ApiCategory[]> {
  return apiFetch<ApiCategory[]>("/categories").then((r) => r.data);
}

/** GET /api/categories/:id — one category (includes children). */
export function getCategory(id: string): Promise<ApiCategory> {
  return apiFetch<ApiCategory>(`/categories/${id}`).then((r) => r.data);
}

// --- Products: shared shape --------------------------------------------------
// The Product row shape is shared by the customer catalog AND the AI search.
// The customer catalog (GET /api/products) additionally returns real images
// (image_url + images[]), the joined category, and live stock availability.

export type ApiProductImageEntry = {
  id: string;
  image_url: string;
  alt_text_ar: string | null;
  is_primary: boolean;
};

export type ApiProduct = {
  id: string;
  category_id?: string | null;
  sku: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  /** DECIMAL comes back as a string from Sequelize/Postgres. */
  price_sar: string | number;
  vat_rate: string | number;
  status?: "draft" | "active" | "archived";
  weight_grams?: number | null;
  is_package?: boolean;
  created_at?: string;
  /** Customer catalog fields (absent on raw CRUD/AI rows). */
  category?: { id: string; slug: string; name_ar: string } | null;
  /** The authorized selling merchant, when the catalog row resolves one. */
  merchant?: { id: string; commercial_name: string } | null;
  image_url?: string | null;
  images?: ApiProductImageEntry[];
  stock_available?: number;
  in_stock?: boolean;
};

// --- Roles -------------------------------------------------------------------
// The OTP verify response has no roles; they live in user_roles ↔ roles. We
// resolve the slugs once after login and store them on the session user so
// role-redirect and the admin/merchant guards can branch without extra calls.

type ApiRole = { id: string; slug: string; name_ar?: string };
type ApiUserRole = { id: string; user_id: string; role_id: string };

export async function fetchUserRoleSlugs(): Promise<string[]> {
  const response = await apiFetch<{ roles: string[] }>("/users/me/roles");
  return response.data.roles;
}

// --- Multipart upload --------------------------------------------------------

/**
 * Multipart POST (file uploads). Same auth + error normalization as apiFetch,
 * but the browser sets the multipart boundary header itself.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  { timeoutMs = 30_000 }: { timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiRequestError("انتهت مهلة رفع الملف، حاول مجددًا.", { code: "client_timeout" });
    }
    throw new ApiRequestError("تعذّر الاتصال بالخادم أثناء رفع الملف.", { code: "network" });
  } finally {
    clearTimeout(timer);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    /* ignore */
  }
  if (!response.ok || !json?.ok) {
    throw new ApiRequestError(json?.error || `فشل رفع الملف (HTTP ${response.status})`, {
      status: response.status,
      code: response.status === 422 ? "validation" : "http_error",
      details: json?.details ?? null,
    });
  }
  return json.data;
}

// --- AI: semantic product search ---------------------------------------------

/**
 * The AI intent, returned as a PRIVACY-SAFE summary by the backend — it does not
 * echo the raw extracted keywords/prices, only whether each filter was applied.
 * (Older builds returned the full arrays; both shapes are tolerated here.)
 */
export type SearchIntent = {
  keywords_count?: number;
  has_price_filter?: boolean;
  has_category_filter?: boolean;
  // Legacy full shape (optional — no longer sent by the current backend).
  keywords?: string[];
  category_slug?: string;
  price_min?: number;
  price_max?: number;
};

export type AiSearchPagination = Pagination;

export type AiSearchResult = {
  intent: SearchIntent;
  products: ApiProduct[];
  pagination: AiSearchPagination;
};

export function aiProductSearch(
  query: string,
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {},
): Promise<AiSearchResult> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch<AiSearchResult>(`/ai/product-search?${params}`, {
    method: "POST",
    body: { query },
    timeoutMs: AI_TIMEOUT_MS,
  }).then((r) => r.data);
}

// --- Operations -------------------------------------------------------------

export type ApiOperationsOrder = {
  id: string;
  number: string;
  status: string;
  total_sar: number;
  placed_at: string;

  customer?: {
    id: string;
    full_name: string;
    phone: string;
  };

  merchant?: {
    id: string;
    commercial_name: string;
  };

  items: {
    id: string;
    product_id: string;
    package_id: string | null;
    name_snapshot_ar: string;
    sku_snapshot: string;
    quantity: number;
    unit_price_sar: number;
    line_total_sar: number;
  }[];

  shipment?: {
    id: string;
    order_id: string;
    carrier: string;
    tracking_number: string;
    status: string;
    shipped_at: string | null;
    delivered_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
};

export function getOperationsOrders() {
  return apiFetch<ApiOperationsOrder[]>("/operations/orders").then((r) => r.data);
}
export function updateOperationsOrderStatus(id: string, status: string) {
  return apiFetch<ApiOperationsOrder>(`/operations/orders/${id}/status`, {
    method: "PATCH",
    body: { status },
  }).then((r) => r.data);
}
// --- Operations Support Tickets ---------------------------------------------

export type ApiSupportTicket = {
  id: string;
  user_id: string;
  order_id: string | null;

  subject_ar: string;
  message_ar: string;

  status: "open" | "in_progress" | "resolved" | "closed";
  category: string;

  created_at: string;

  User?: {
    id: string;
    full_name: string;
    phone: string;
  };

  Order?: {
    id: string;
    number: string;
  } | null;
};

export function getOperationsSupportTickets() {
  return apiFetch<ApiSupportTicket[]>("/operations/support-tickets").then((r) => r.data);
}

export function updateOperationsSupportTicketStatus(
  id: string,
  status: ApiSupportTicket["status"],
) {
  return apiFetch<ApiSupportTicket>(`/operations/support-tickets/${id}/status`, {
    method: "PATCH",
    body: { status },
  }).then((r) => r.data);
}
export function createCustomerSupportTicket(data: {
  subject_ar: string;
  message_ar: string;
  category?: string;
  order_id?: string;
}) {
  return apiFetch("/support/tickets", {
    method: "POST",
    body: data,
  }).then((r) => r.data);
}

export type ApiMerchantInventoryItem = {
  id: string;
  product_id: string | null;
  package_id: string | null;

  name_ar: string;
  sku: string;

  on_hand: number;
  reserved: number;
  available: number;

  reorder_threshold: number;
  is_active: boolean;
};

export function getMerchantInventory() {
  return apiFetch<ApiMerchantInventoryItem[]>("/merchant/inventory").then((r) => r.data);
}
export type ApiOperationsReports = {
  fulfilment: {
    orders_by_status: Record<string, number>;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };

  shipments: {
    total: number;
    delivered: number;
    failed: number;
    delivery_success_rate_pct: number | null;
  };

  inventory: {
    total_skus: number;
    total_units_on_hand: number;
    low_stock_skus: number;
    out_of_stock_skus: number;
  };

  top_adjusted_skus: {
    inventory_id: string;
    sku: string | null;
    name_ar: string | null;
    movements: number;
    net_delta: number;
    current_on_hand: number | null;
  }[];

  adjustments: {
    count: number;
    net_delta: number;
  };
};

export function getOperationsReports() {
  return apiFetch<ApiOperationsReports>("/operations/reports").then((r) => r.data);
}
