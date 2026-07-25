/**
 * Thin fetch wrapper for talking to the Subh Backend API.
 *
 * - Base URL comes from `VITE_API_BASE_URL` (see .env.local). Falls back to
 *   http://localhost:3000 for local dev so the app still boots without an
 *   explicit env file.
 * - The bearer token is read from `subh:token` (set by auth.ts after a real
 *   OTP login). Requests with no token omit the Authorization header — the
 *   backend will then respond 401 and the caller decides what to do.
 * - Always sets `Content-Type: application/json` for bodies, and parses JSON
 *   responses. Throws `ApiError` on non-2xx so React Query/useMutation surface
 *   a clean error message to the UI.
 *
 * Kept deliberately small — it does NOT add interceptors, retries, or caching.
 * React Query (already installed and wired in __root.tsx) handles caching and
 * refetching; this client just maps fetch → typed JSON | throw.
 */

const TOKEN_KEY = "subh:token";

/**
 * Backend base URL. Read once at module load; changing it requires a reload
 * (matches how Vite env vars work).
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000";

/** Token management — kept in this module so the API client is the single
 *  place that reads/writes the bearer. */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage errors */
  }
}

/** Error thrown on any non-2xx response. Carries the server message + status
 *  so the UI can show a precise toast instead of a generic "something failed". */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  code?: string;

  constructor(status: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // Query params merged into the URL.
  query?: Record<string, string | number | boolean | undefined | null>;
  // JSON body — serialized automatically.
  body?: unknown;
  // Bypass the Authorization header (e.g. for the public OTP endpoints).
  skipAuth?: boolean;
  // Optional AbortSignal for React Query cancellation.
  signal?: AbortSignal;
};

/** Build a URL with query string, omitting undefined/null values. */
function buildUrl(path: string, query?: FetchOptions["query"]): string {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/** Extract the most useful human message from a backend error body. The Subh
 *  backend normalizes errors to { ok:false, error, details?, code? }. */
function pickMessage(
  body: unknown,
  fallback: string,
): { message: string; code?: string; details?: unknown } {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const message =
      typeof b.error === "string" ? b.error : typeof b.message === "string" ? b.message : fallback;
    const code = typeof b.code === "string" ? b.code : undefined;
    return { message, code, details: b.details };
  }
  return { message: fallback };
}

/**
 * Core request method. Returns parsed JSON on 2xx; throws ApiError otherwise.
 *
 *   const products = await apiRequest<Paginated<AdminProduct>>("/api/admin/products");
 */
export async function apiRequest<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!opts.skipAuth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    // Network failure / CORS / server down. Surface a clear message.
    throw new ApiError(0, "تعذّر الاتصال بالخادم. تحقّق من تشغيل الـ Backend.", {
      cause: String(err),
    });
  }

  // 204 No Content (some DELETEs) → return null.
  if (res.status === 204) return null as T;

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const { message, code, details } = pickMessage(parsed, `فشل الطلب (HTTP ${res.status})`);
    throw new ApiError(res.status, message, details, code);
  }

  return parsed as T;
}

/** Convenience helpers — keep call sites short and readable. */
export const api = {
  get: <T = unknown>(path: string, query?: FetchOptions["query"], signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "GET", query, signal }),
  post: <T = unknown>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "POST", body, signal }),
  put: <T = unknown>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "PUT", body, signal }),
  patch: <T = unknown>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "PATCH", body, signal }),
  del: <T = unknown>(path: string, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "DELETE", signal }),
};

/** Standard paginated envelope returned by every list endpoint in the backend. */
export type Paginated<T> = {
  ok: true;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** Standard single-resource envelope. */
export type ApiOk<T> = { ok: true; data: T };

export default api;
