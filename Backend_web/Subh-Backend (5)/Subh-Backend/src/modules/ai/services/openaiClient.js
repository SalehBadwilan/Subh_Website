/**
 * Low-level OpenAI client with retry + timeout.
 *
 * Single responsibility: call the OpenAI Chat Completions endpoint with:
 *   - a per-attempt timeout (AbortController), so a hung connection can never
 *     block a request worker indefinitely, and so timeout does NOT leak across
 *     retries;
 *   - retry ONLY for transient failures (timeout, network, HTTP 408/429/5xx),
 *     honoring the provider's `Retry-After` header when present, with capped
 *     exponential backoff + jitter otherwise;
 *   - translation of every failure mode into a specific AiProviderError code
 *     (timeout / rate_limited / provider_error / empty_response /
 *     truncated_response).
 *
 * Why fetch + AbortController (not the `openai` SDK / axios):
 *  - Node >= 18 ships a global fetch, so we add zero dependencies.
 *  - AbortController gives a clean, cancellation-aware timeout that also
 *    releases the underlying socket.
 *
 * Security: the API key is read from env only and is NEVER accepted as a
 * parameter, logged, or returned. Provider error bodies are trimmed before
 * being attached to errors.
 */
import env from '../../../config/env.js';
import logger from '../../../config/logger.js';
import {
  AiProviderError,
  aiTimeout,
  aiProviderError,
  aiNotConfigured,
  aiRateLimited,
  aiEmptyResponse,
  aiTruncatedResponse,
  isTransientError,
} from '../utils/aiErrors.js';

// Chat Completions endpoint URL.
//
// The client speaks the OpenAI Chat Completions schema, so it works against any
// OpenAI-compatible endpoint. The base URL comes from env.aiBaseUrl (read from
// AI_BASE_URL) and we append '/chat/completions'. This lets us switch the
// provider (OpenAI vs Google Gemini's OpenAI-compat shim) purely via config —
// no code change.
//
// AI_CHAT_URL (test-only, set by scripts/test-ai-integration.mjs) overrides the
// whole URL so integration tests can point at a local mock server; it is
// intentionally absent from .env.example and must never be set in production.
const OPENAI_CHAT_URL =
  process.env.AI_CHAT_URL || `${env.aiBaseUrl}/chat/completions`;

// Upper bound on a single backoff sleep, regardless of Retry-After, to keep
// request latency predictable. 8s is generous; the client budget is small.
const MAX_BACKOFF_MS = 8000;

/**
 * Sleep helper that does NOT reject on abort (we never cancel backoff sleeps).
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse an HTTP `Retry-After` header value (seconds OR HTTP-date) into ms.
 * Returns null when absent or unparseable.
 */
function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const s = String(headerValue).trim();

  // Form 1: a non-negative integer = seconds.
  if (/^\d+$/.test(s)) {
    const seconds = Number.parseInt(s, 10);
    return Number.isFinite(seconds) ? seconds * 1000 : null;
  }
  // Form 2: an HTTP-date.
  const date = new Date(s);
  const ms = date.getTime() - Date.now();
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/**
 * Compute the backoff delay for attempt `attempt` (0-based) using exponential
 * backoff with full jitter, capped at MAX_BACKOFF_MS.
 */
function backoffDelay(attempt) {
  const base = env.aiBaseRetryDelayMs;
  const exp = base * 2 ** attempt;
  const capped = Math.min(exp, MAX_BACKOFF_MS);
  // Full jitter: random in [0, capped].
  return Math.floor(Math.random() * (capped + 1));
}

/**
 * One single attempt: build the request, enforce timeout via AbortController,
 * and return the parsed OpenAI JSON body. Throws AiProviderError on any failure.
 */
async function singleAttempt({ body, timeoutMs, attemptLabel }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.aiApiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError => OUR timeout fired (or the client aborted the request).
    if (err && err.name === 'AbortError') {
      logger.warn(`${attemptLabel} timed out after ${timeoutMs}ms`);
      throw aiTimeout(timeoutMs);
    }
    // Any other throw (DNS, connection reset, TLS, …) is a network failure.
    logger.error(`${attemptLabel} network failure:`, err.message);
    throw aiProviderError(0, err.message);
  } finally {
    clearTimeout(timer);
  }

  // --- 429: rate limited. Parse Retry-After and surface a dedicated error so
  // the retry loop (and the client) can honor it.
  if (response.status === 429) {
    const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
    logger.warn(`${attemptLabel} rate limited (retry-after-ms=${retryAfterMs ?? 'n/a'})`);
    throw aiRateLimited(retryAfterMs);
  }

  // --- Other non-2xx: map to provider_error (transience derived from status).
  if (!response.ok) {
    let providerMessage = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      providerMessage = errJson?.error?.message || providerMessage;
    } catch {
      /* ignore JSON parse errors on error bodies */
    }
    logger.error(`${attemptLabel} provider error ${response.status}: ${providerMessage}`);
    throw aiProviderError(response.status, providerMessage);
  }

  // --- Success body parse.
  let data;
  try {
    data = await response.json();
  } catch (err) {
    logger.error(`${attemptLabel} success body parse failed:`, err.message);
    throw aiProviderError(response.status, 'invalid JSON in success response');
  }

  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  const finishReason = choice?.finish_reason ?? null;
  const usage = data?.usage ?? null;

  // Empty / unusable completions are NOT a success, even on HTTP 200.
  if (typeof content !== 'string' || content.trim() === '') {
    logger.error(`${attemptLabel} empty completion (finish_reason=${finishReason})`);
    // content_filter / length / null each carry a distinct, useful signal.
    if (finishReason && finishReason !== 'stop') {
      throw aiTruncatedResponse(finishReason);
    }
    throw aiEmptyResponse();
  }

  // finish_reason length/content_filter on a NON-empty body is a truncated/
  // filtered response — still usable, but flag it so callers know the model
  // didn't finish cleanly. We return success here (we have content) but log it.
  if (finishReason && finishReason !== 'stop' && !env.isProd) {
    logger.debug(`${attemptLabel} non-stop finish_reason=${finishReason} (content present)`);
  }

  if (!env.isProd) {
    logger.debug(
      `${attemptLabel} ok (model=${body.model}, tokens=${usage?.total_tokens ?? '?'})`,
    );
  }

  return { content, usage, finishReason };
}

/**
 * Call OpenAI Chat Completions with a system+user turn, retrying transient
 * failures only.
 *
 * @param {object} params
 * @param {string} params.system    System prompt.
 * @param {string} params.user      User turn content.
 * @param {object} [params.options]
 * @param {string} [params.options.model]     Override env.aiModel.
 * @param {number} [params.options.maxTokens] Override env.aiMaxTokens.
 * @param {number} [params.options.timeoutMs] Override env.aiTimeoutMs.
 * @param {number} [params.options.maxRetries] Override env.aiMaxRetries.
 * @returns {Promise<{ content: string, usage: object|null }>}
 * @throws {AiProviderError} on timeout, rate limit, non-2xx, network, empty,
 *   or truncated completion — after exhausting the retry budget.
 */
export async function chatCompletion({ system, user, options = {} }) {
  // Refuse to call without a key — callers gate on this too, but defend here.
  if (!env.aiApiKeyConfigured) {
    throw aiNotConfigured();
  }

  const model = options.model || env.aiModel;
  const maxTokens = options.maxTokens || env.aiMaxTokens;
  const timeoutMs = options.timeoutMs || env.aiTimeoutMs;
  const maxRetries = Math.min(Math.max(options.maxRetries ?? env.aiMaxRetries, 0), 4);

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0, // deterministic extraction — stable structured output
  };

  const totalAttempts = maxRetries + 1;
  let lastError = null;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const attemptLabel = `[ai] OpenAI attempt ${attempt + 1}/${totalAttempts}`;

    try {
      return await singleAttempt({ body, timeoutMs, attemptLabel });
    } catch (err) {
      lastError = err;

      // Not transient (e.g. 401/403/400/parse_error) OR no retries left → give up.
      const canRetry = isTransientError(err) && attempt < totalAttempts - 1;
      if (!canRetry) {
        if (err instanceof AiProviderError) throw err;
        // Unexpected non-Ai error — wrap as a provider error so the handler maps it.
        logger.error(`${attemptLabel} unrecoverable error:`, err.message);
        throw aiProviderError(0, err.message);
      }

      // Decide how long to wait before the next attempt.
      let delay;
      if (err.code === 'rate_limited' && err.details?.retry_after_ms != null) {
        // Honor the server's Retry-After, capped to keep latency bounded.
        delay = Math.min(err.details.retry_after_ms, MAX_BACKOFF_MS);
      } else {
        delay = backoffDelay(attempt);
      }
      logger.warn(`${attemptLabel} transient [${err.code}] → retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  // Defensive: the loop always returns or throws above, but keep TS/linters calm.
  throw lastError instanceof AiProviderError
    ? lastError
    : aiProviderError(0, 'exhausted retries');
}

export default chatCompletion;
