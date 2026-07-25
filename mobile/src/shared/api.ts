/**
 * طبقة الـ API — النواة (اتصال حقيقي بالباك إند Subh-Backend).
 *
 * apiFetch() هو نقطة الاتصال الوحيدة: يرفق التوكن تلقائيًا من SecureStore،
 * يفرض مهلة عبر AbortController، ويُطبّع كل خطأ إلى ApiResult<T> موحّد
 * (بدل رمي استثناء) حتى تبقى كل شاشة تكتب `if (res.ok) ...` ببساطة.
 *
 *   requestOtp/verifyOtp → POST /auth/otp/request|verify
 *   getCategories        → GET  /categories
 *   aiProductSearch       → POST /ai/product-search
 *
 * حالة الـ API قابلة للتبديل عبر EXPO_PUBLIC_API_MODE (mock تُبقي فقط لتوافق
 * الشاشات القديمة أثناء الانتقال؛ القيمة الفعلية المستخدمة الآن `live`).
 */
import { AUTH_TOKEN_KEY, getSecureItem } from "@/lib/storage";

export const API_MODE: "mock" | "live" =
  process.env.EXPO_PUBLIC_API_MODE === "live" ? "live" : "mock";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

/** مهلة افتراضية؛ نداءات الذكاء الاصطناعي تحصل على مهلة أطول (مزوّد خارجي). */
const DEFAULT_TIMEOUT_MS = 15_000;
const AI_TIMEOUT_MS = 25_000;

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiErrorCode =
  | "timeout"
  | "not_configured"
  | "provider_error"
  | "parse_error"
  | "client_timeout"
  | "network"
  | "validation"
  | "http_error"
  /** حارس بوابة التاجر (middleware/merchantAuth.js) — يحتاج تمييزًا دقيقًا لعرض الحالة الصحيحة. */
  | "not_merchant"
  | "merchant_suspended"
  | "merchant_terminated";

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
      message?: string;
      pagination?: Pagination;
      summary?: unknown;
    }
  | { ok: false; error: string; code: ApiErrorCode; status: number };

type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
  /** جانب اختياري: بعض مسارات التاجر (settlements) تُرجعه كحقل شقيق لـ data. */
  summary?: unknown;
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
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const token = await getSecureItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name: string }).name === "AbortError"
    ) {
      return {
        ok: false,
        error: "انتهت مهلة الاتصال بالخادم، تأكد من تشغيله وحاول مجددًا.",
        code: "client_timeout",
        status: 0,
      };
    }

    return {
      ok: false,
      error: "تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وأن الخادم يعمل.",
      code: "network",
      status: 0,
    };
  } finally {
    clearTimeout(timer);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    /* body غير قابل للتحليل — يُعالَج أدناه عبر response.ok */
  }

  if (!response.ok || !json?.ok) {
    const backendCode = json?.code;
    const code: ApiErrorCode =
      backendCode === "timeout" ||
      backendCode === "not_configured" ||
      backendCode === "provider_error" ||
      backendCode === "parse_error" ||
      backendCode === "not_merchant" ||
      backendCode === "merchant_suspended" ||
      backendCode === "merchant_terminated"
        ? backendCode
        : response.status === 422
          ? "validation"
          : "http_error";
    return {
      ok: false,
      error: json?.error || `فشل الطلب (HTTP ${response.status})`,
      code,
      status: response.status,
    };
  }

  return {
    ok: true,
    data: json.data,
    message: json.message,
    pagination: json.pagination,
    summary: json.summary,
  };
}

// --- Auth: OTP ----------------------------------------------------------------

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
  /** يصلان جاهزين من verify-otp مباشرة — بلا نداء إضافي لجلب الأدوار. */
  merchant_id: string | null;
  roles: string[];
};

export type RequestOtpResult = {
  phone: string;
  expires_in_seconds: number;
  /** يصل فقط في بيئة التطوير (لا مزوّد SMS بعد). */
  devOtp?: string;
};

export function requestOtp(
  phone: string,
): Promise<ApiResult<RequestOtpResult>> {
  return apiFetch<RequestOtpResult>("/auth/otp/request", {
    method: "POST",
    body: { phone },
  });
}

export type VerifyOtpResult = {
  user: AuthUser;
  token: string;
  token_expires_in: string;
};

export function verifyOtp(
  phone: string,
  otp: string,
): Promise<ApiResult<VerifyOtpResult>> {
  return apiFetch<VerifyOtpResult>("/auth/otp/verify", {
    method: "POST",
    body: { phone, otp },
  });
}

// --- Catalog: categories --------------------------------------------------------

export type ApiCategory = {
  id: string;
  slug: string;
  name_ar: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export function getCategories(): Promise<ApiResult<ApiCategory[]>> {
  return apiFetch<ApiCategory[]>("/categories");
}

// --- Products: shared shape (customer catalog + AI search) ----------------------

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
  /** DECIMAL يصل كنص من Sequelize/Postgres. */
  price_sar: string | number;
  vat_rate: string | number;
  status?: "draft" | "active" | "archived";
  weight_grams?: number | null;
  is_package?: boolean;
  created_at?: string;
  category?: { id: string; slug: string; name_ar: string } | null;
  merchant?: { id: string; commercial_name: string } | null;
  image_url?: string | null;
  images?: ApiProductImageEntry[];
  stock_available?: number;
  in_stock?: boolean;
};

// --- AI: semantic product search --------------------------------------------------

/** ملخّص خصوصية — لا يُرجع الباك إند الكلمات/الأسعار الخام. */
export type SearchIntent = {
  keywords_count?: number;
  has_price_filter?: boolean;
  has_category_filter?: boolean;
};

export type AiSearchResult = {
  intent: SearchIntent;
  products: ApiProduct[];
  pagination: Pagination;
};

export function aiProductSearch(
  query: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
): Promise<ApiResult<AiSearchResult>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<AiSearchResult>(`/ai/product-search?${params}`, {
    method: "POST",
    body: { query },
    timeoutMs: AI_TIMEOUT_MS,
  });
}
