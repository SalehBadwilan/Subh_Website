/**
 * Payment provider abstraction.
 *
 * Two implementations share the same interface so the rest of the payment flow
 * is provider-agnostic:
 *
 *   test    — simulated gateway. Works with ZERO external keys; used in dev and
 *             in automated tests. Generates deterministic references and a
 *             "client secret" so the frontend flow is identical to a real one.
 *   moyasar — Saudi gateway (mada, Apple Pay, STC Pay, cards). Activated by
 *             setting MOYASAR_SECRET_KEY. Calls Moyasar's REST API.
 *
 * Every method returns a NORMALIZED object; provider-specific raw payloads are
 * kept under `raw` for the audit/event log.
 *
 * Interface (implemented by both):
 *   createIntent({ amount, currency, description, callbackUrl, metadata })
 *     -> { id, providerReference, status: 'initiated', clientSecret?, raw }
 *   fetchPayment(providerReference)
 *     -> { id, providerReference, status, amount, raw }
 *   confirm(providerReference, { source })  // client-side confirm / 3DS result
 *     -> { id, providerReference, status, raw }
 *   verifyWebhookSignature(rawBody, signature)
 *     -> boolean
 *   parseWebhookEvent(rawBody)
 *     -> { eventId, eventType, providerReference, status, amount, raw }
 *
 * `status` is normalized to one of the Payment.status enum values:
 *   'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'disputed'
 */
import crypto from 'crypto';
import env, { effectivePaymentProvider } from '../../../config/env.js';
import { ApiError } from '../../../utils/ApiError.js';

/**
 * Map a provider-specific status string to the local Payment.status enum.
 */
export function normalizeStatus(rawStatus) {
  const s = String(rawStatus || '').toLowerCase();
  // captured / paid / succeeded → captured
  if (['captured', 'paid', 'succeeded', 'completed', 'success'].includes(s)) return 'captured';
  // authorized (but not captured yet)
  if (['authorized', 'authorized_pending'].includes(s)) return 'authorized';
  // failed / declined / canceled
  if (['failed', 'declined', 'canceled', 'cancelled', 'failed_capture'].includes(s)) return 'failed';
  // refunded
  if (['refunded', 'partial_refunded'].includes(s)) return 'refunded';
  // disputed / chargeback
  if (['disputed', 'chargeback'].includes(s)) return 'disputed';
  // initiated / pending / created / new
  return 'initiated';
}

/**
 * Convert a SAR amount (Decimal/number/string) to the smallest currency unit
 * Moyasar expects (halalas = SAR * 100), as an integer string.
 */
function toMinorUnits(amountSar) {
  const n = Number(amountSar);
  if (!Number.isFinite(n)) throw new ApiError(500, 'مبلغ الدفع غير صالح');
  return String(Math.round(n * 100));
}

// ---------------------------------------------------------------------------
// test provider — simulated, no network, no keys.
// ---------------------------------------------------------------------------
const testProvider = {
  name: 'test',

  async createIntent({ amount, currency, description, metadata }) {
    const id = `test_pi_${crypto.randomBytes(12).toString('hex')}`;
    const providerReference = `test_ref_${crypto.randomBytes(8).toString('hex')}`;
    return {
      id,
      providerReference,
      status: 'initiated',
      // In test mode the client "confirms" by POSTing to /confirm with this.
      clientSecret: `${id}_secret_${crypto.randomBytes(6).toString('hex')}`,
      amountSar: Number(amount),
      currency: currency || 'SAR',
      description: description || null,
      metadata: metadata || null,
      raw: { provider: 'test', simulated: true },
    };
  },

  async fetchPayment(providerReference) {
    // The test provider has no persisted server-side state beyond our DB, so we
    // return the current reference with an 'initiated' status — the source of
    // truth is the confirm() call and our Payment row.
    return {
      providerReference,
      status: 'initiated',
      raw: { provider: 'test', simulated: true },
    };
  },

  async confirm(providerReference, { source } = {}) {
    // Test mode succeeds unless the card / source encodes a failure.
    // Convention: source.last4 === '0002' → simulate decline.
    const fail = source && /0002$/.test(String(source.last4 || source.number || ''));
    const status = fail ? 'failed' : 'captured';
    return {
      providerReference,
      status,
      raw: { provider: 'test', simulated: true, source: source || null },
    };
  },

  verifyWebhookSignature(_rawBody, signature) {
    // Test mode: when a PAYMENT_WEBHOOK_SECRET is set, require it to match.
    // Otherwise accept (so the simulated webhook path is exercisable in dev).
    if (!env.payment.webhookSecret) return true;
    return String(signature || '') === env.payment.webhookSecret;
  },

  parseWebhookEvent(rawBody) {
    // Test webhook payload shape:
    //   { event_id, event_type, reference, status, amount_sar, ... }
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    return {
      eventId: body.event_id || `test_evt_${crypto.randomBytes(6).toString('hex')}`,
      eventType: body.event_type || body.type || 'payment.captured',
      providerReference: body.reference || body.provider_reference,
      status: normalizeStatus(body.status),
      amountSar: body.amount_sar != null ? Number(body.amount_sar) : null,
      raw: body,
    };
  },
};

// ---------------------------------------------------------------------------
// moyasar provider — calls Moyasar REST API (https://api.moyasar.com/v1).
// ---------------------------------------------------------------------------

/**
 * Minimal fetch wrapper for Moyasar. Uses Basic auth with the secret key as
 * username (per Moyasar docs). Throws ApiError on non-2xx.
 */
async function moyasarRequest(path, { method = 'POST', body, idempotencyKey } = {}) {
  const base = env.payment.moyasar.apiBaseUrl.replace(/\/$/, '');
  const headers = {
    Authorization: `Basic ${Buffer.from(`${env.payment.moyasar.secretKey}:`).toString('base64')}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(502, 'تعذّر الاتصال ببوابة الدفع (Moyasar)', { cause: String(err) });
  }

  const text = await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const msg = (parsed && parsed.message) || `Moyasar error (HTTP ${res.status})`;
    throw new ApiError(502, 'فشل إنشاء عملية الدفع لدى البوابة', { provider: 'moyasar', status: res.status, message: msg });
  }

  return parsed;
}

/**
 * Normalize a Moyasar payment object to the local interface.
 */
function fromMoyasarPayment(p) {
  return {
    providerReference: p.id,
    status: normalizeStatus(p.status),
    amountSar: p.amount != null ? Number(p.amount) / 100 : null,
    raw: p,
  };
}

const moyasarProvider = {
  name: 'moyasar',

  async createIntent({ amount, currency, description, callbackUrl, metadata }) {
    // Moyasar "payments" API creates a payment that the client confirms with
    // card/source details. amount is in halalas (minor units).
    const created = await moyasarRequest('/payments', {
      method: 'POST',
      idempotencyKey: metadata && metadata.paymentId ? `pay_${metadata.paymentId}` : undefined,
      body: {
        amount: toMinorUnits(amount),
        currency: (currency || 'SAR').toLowerCase(),
        description: description || 'Subh order',
        callback_url: callbackUrl,
        source: { type: 'creditcard' },
        metadata: metadata || {},
      },
    });
    return {
      id: created.id,
      providerReference: created.id,
      status: normalizeStatus(created.status),
      clientSecret: undefined, // Moyasar uses the publishable key client-side
      amountSar: Number(created.amount) / 100,
      currency: (currency || 'SAR').toUpperCase(),
      raw: created,
    };
  },

  async fetchPayment(providerReference) {
    const p = await moyasarRequest(`/payments/${providerReference}`, { method: 'GET' });
    return fromMoyasarPayment(p);
  },

  async confirm(providerReference, { source } = {}) {
    // In Moyasar, the client POSTs the card/token to /payments/:id via the
    // publishable key. Here we re-fetch to reflect the latest status; the
    // actual capture happens via the webhook.
    const p = await moyasarRequest(`/payments/${providerReference}`, { method: 'GET' });
    return fromMoyasarPayment(p);
  },

  verifyWebhookSignature(rawBody, signature) {
    // Moyasar does not sign webhooks with a shared secret by default; instead
    // we rely on Basic auth on the webhook endpoint when a secret is configured.
    // If PAYMENT_WEBHOOK_SECRET is set, require it as the `x-secret` header.
    if (!env.payment.webhookSecret) return true;
    return String(signature || '') === env.payment.webhookSecret;
  },

  parseWebhookEvent(rawBody) {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const p = body.data || body.payment || body;
    return {
      eventId: body.id || body.event_id || `moyasar_evt_${p.id || crypto.randomBytes(6).toString('hex')}`,
      eventType: body.type || body.event_type || 'payment.captured',
      providerReference: p.id,
      status: normalizeStatus(p.status),
      amountSar: p.amount != null ? Number(p.amount) / 100 : null,
      raw: body,
    };
  },
};

/**
 * Resolve the active provider based on configuration.
 */
export function getPaymentProvider() {
  const provider = effectivePaymentProvider();
  if (provider === 'moyasar') {
    if (!env.payment.moyasar.secretKey) {
      throw new ApiError(500, 'مزوّل الدفع Moyasar مفعّل لكن المفتاح غير مُهيّأ');
    }
    return moyasarProvider;
  }
  return testProvider;
}

export function getProviderName() {
  return effectivePaymentProvider();
}

export default { getPaymentProvider, getProviderName, normalizeStatus };
