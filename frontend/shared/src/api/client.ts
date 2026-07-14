import { HTTP_CONFIG, API_ERROR_CODES } from '../constants/config';
import type { ApiResult, ApiError, MutationOptions } from '../types/api';

export interface HttpClientOptions {
  baseUrl: string;
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
}

type Query = Record<string, string | number | boolean | undefined>;

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  private buildUrl(path: string, query?: Query): string {
    const url = new URL(path, this.opts.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    opts?: { query?: Query; body?: unknown; mutation?: MutationOptions },
  ): Promise<ApiResult<T>> {
    const url = this.buildUrl(path, opts?.query);
    const token = this.opts.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts?.mutation?.idempotencyKey) {
      headers['Idempotency-Key'] = opts.mutation.idempotencyKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_CONFIG.timeoutMs);
    const signal = opts?.mutation?.signal ?? controller.signal;

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
        signal,
      });
      clearTimeout(timeout);

      if (res.status === 401) {
        this.opts.onUnauthorized();
        throw apiError(API_ERROR_CODES.AUTH_UNAUTHORIZED, 'انتهت الجلسة. سجّل الدخول من جديد.');
      }

      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const err: ApiError = payload?.error ?? {
          code: API_ERROR_CODES.SERVER_ERROR,
          message: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
        };
        throw err;
      }

      return (payload ?? { data: {} as T }) as ApiResult<T>;
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw apiError(API_ERROR_CODES.TIMEOUT, 'انتهت مهلة الطلب. تحقق من اتصالك.');
      }
      throw e;
    }
  }

  get<T>(path: string, query?: Query): Promise<ApiResult<T>> {
    return this.request<T>('GET', path, { query });
  }
  post<T>(path: string, body?: unknown, mutation?: MutationOptions): Promise<ApiResult<T>> {
    return this.request<T>('POST', path, { body, mutation });
  }
  put<T>(path: string, body?: unknown, mutation?: MutationOptions): Promise<ApiResult<T>> {
    return this.request<T>('PUT', path, { body, mutation });
  }
  patch<T>(path: string, body?: unknown, mutation?: MutationOptions): Promise<ApiResult<T>> {
    return this.request<T>('PATCH', path, { body, mutation });
  }
  delete<T>(path: string, mutation?: MutationOptions): Promise<ApiResult<T>> {
    return this.request<T>('DELETE', path, { mutation });
  }
}

/** بناء كائن ApiError بسرعة. */
export function apiError(code: string, message: string, field?: string): ApiError {
  return { code, message, field };
}
