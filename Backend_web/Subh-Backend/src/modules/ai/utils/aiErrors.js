/**
 * AI-specific errors.
 *
 * These extend ApiError so the centralized error handler in app.js already
 * understands them, but they carry an extra `code` so the handler (and the
 * client) can distinguish WHY an AI call failed:
 *
 *   'not_configured'    → 503  (AI_API_KEY missing; feature is off)
 *   'timeout'           → 504  (the provider did not answer in time)
 *   'rate_limited'      → 429  (provider returned 429; honor Retry-After)
 *   'provider_error'    → 502  (OpenAI non-2xx other than 429, or network)
 *   'parse_error'       → 502  (model replied, but invalid JSON/shape)
 *   'empty_response'    → 502  (provider returned an empty completion)
 *   'truncated_response'→ 502  (finish_reason length/content_filter/null)
 *
 * Security: these never include the API key or the raw provider body in the
 * response — only a short, safe message. The raw detail is logged server-side.
 *
 * Transient classification (`isTransientError`) drives retry decisions in the
 * OpenAI client: only transient errors (timeout / network / 408 / 429 / 5xx)
 * are retried; permanent 4xx errors (401/403/400/422) are not.
 */
import { ApiError } from '../../../utils/ApiError.js';

export class AiProviderError extends ApiError {
  /**
   * @param {number} status   HTTP status to send to the client.
   * @param {string} message  Safe, user-facing message (Arabic).
   * @param {object} [opts]
   * @param {string} opts.code        Machine-readable error code.
   * @param {boolean} [opts.transient] Whether this error is worth retrying.
   * @param {object} [opts.details]   Extra structured details for the response.
   */
  constructor(status, message, { code, transient = false, details = null } = {}) {
    super(status, message, details);
    this.name = 'AiProviderError';
    this.code = code || 'provider_error';
    this.transient = Boolean(transient);
  }
}

/** AI feature is disabled because AI_API_KEY is not set. → 503 (not transient) */
export const aiNotConfigured = () =>
  new AiProviderError(503, 'خدمة البحث الذكي غير مهيأة حاليًا', {
    code: 'not_configured',
    transient: false,
    details: { hint: 'لم يتم ضبط مفتاح الذكاء الاصطناعي (AI_API_KEY).' },
  });

/** The provider did not respond before the timeout elapsed. → 504 (transient) */
export const aiTimeout = (timeoutMs) =>
  new AiProviderError(504, 'انتهت مهلة انتظار مزود الذكاء الاصطناعي، حاول لاحقًا', {
    code: 'timeout',
    transient: true,
    details: { timeout_ms: timeoutMs },
  });

/**
 * Provider returned 429 Too Many Requests. → 429 (transient).
 * @param {number|null} retryAfterMs  Parsed Retry-After value in ms, if any.
 */
export const aiRateLimited = (retryAfterMs) =>
  new AiProviderError(429, 'تم تجاوز حد الطلبات لمزود الذكاء الاصطناعي، حاول بعد قليل', {
    code: 'rate_limited',
    transient: true,
    details: { retry_after_ms: retryAfterMs ?? null },
  });

/**
 * Provider answered with a non-2xx status (other than 429) or was unreachable.
 * → 502. Transience is derived from the HTTP status.
 * @param {number} status  Provider HTTP status (0 = network failure).
 * @param {string} message Short, sanitized provider message.
 */
export const aiProviderError = (status, message) =>
  new AiProviderError(502, 'تعذّر الحصول على نتيجة من مزود الذكاء الاصطناعي', {
    code: 'provider_error',
    transient: isTransientStatus(status),
    details: {
      provider_status: status || null,
      provider_message: message ? String(message).slice(0, 200) : null,
    },
  });

/**
 * Provider replied but the completion was empty (finish_reason=stop, no content).
 * → 502. NOT transient: we call with temperature:0 (deterministic), so resending
 * the identical prompt yields the same empty result and would only burn the
 * retry budget + cost. Surface it immediately so the caller can react.
 */
export const aiEmptyResponse = () =>
  new AiProviderError(502, 'استجابة مزود الذكاء الاصطناعي فارغة', {
    code: 'empty_response',
    transient: false,
  });

/**
 * Provider replied but the completion is unusable (finish_reason = length /
 * content_filter / null). → 502. NOT transient for the same reason as
 * empty_response: with temperature:0 the result is effectively deterministic, so
 * retrying the same request is unlikely to help and wastes budget. Surfacing it
 * immediately lets the caller decide (e.g. simplify the prompt, raise tokens).
 */
export const aiTruncatedResponse = (reason) =>
  new AiProviderError(502, 'استجابة مزود الذكاء الاصطناعي غير مكتملة', {
    code: 'truncated_response',
    transient: false,
    details: reason ? { finish_reason: String(reason).slice(0, 50) } : null,
  });

/** Model replied but we could not parse a valid JSON result. → 502 (NOT transient). */
export const aiParseError = (reason) =>
  new AiProviderError(502, 'تعذّر معالجة استجابة مزود الذكاء الاصطناعي', {
    code: 'parse_error',
    transient: false, // re-sending the identical prompt yields the same bad shape
    details: reason ? { reason: String(reason).slice(0, 200) } : null,
  });

/**
 * Classify a raw provider HTTP status as transient (worth retrying) or not.
 * Rules:
 *   - 0   (network failure / DNS / connection reset) → transient
 *   - 408 (Request Timeout)                          → transient
 *   - 429 (Too Many Requests)                        → transient
 *   - 5xx (server-side, incl. 503)                   → transient
 *   - any other 4xx (400/401/403/404/422 …)          → NOT transient
 */
export function isTransientStatus(status) {
  if (status === 0 || status === 408 || status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

/**
 * Is the given error an AiProviderError flagged transient (retryable)?
 */
export function isTransientError(err) {
  return err instanceof AiProviderError && err.transient === true;
}

export default AiProviderError;
