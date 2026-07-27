/**
 * Payment gateway webhook (server-to-server, NO auth).
 *
 *   POST /api/webhooks/payments
 *
 * Mounted on a DEDICATED /webhooks base path (see routes/index.js) so it never
 * inherits the `authenticate` middleware applied on the customer /payments
 * router. The raw body capture in app.js targets this path.
 *
 * Idempotent by event_id (UNIQUE in payment_events): replaying the same webhook
 * is a no-op. Signature verification is delegated to the active provider; in
 * 'test' mode with no PAYMENT_WEBHOOK_SECRET configured, the endpoint accepts
 * the body so the flow is exercisable in development.
 *
 * Always returns 200 quickly to acknowledge receipt — gateway retry storms are
 * a real risk. Failures are logged, not surfaced, to avoid leaking internals.
 */
import { Router } from 'express';
import asyncHandler from '../../../utils/asyncHandler.js';
import logger from '../../../config/logger.js';

import { getPaymentProvider } from '../services/paymentProvider.js';
import paymentService from '../services/paymentService.js';

export default function createPaymentWebhookRoutes({ models }) {
  const router = Router();

  router.post(
    '/',
    // express.json already parsed req.body (mounted globally). The raw body is
    // available via req.rawBody when captured by the webhook middleware (app.js).
    asyncHandler(async (req, res) => {
      const provider = getPaymentProvider();

      // Signature header is provider-specific; accept a few common names.
      const signature =
        req.get('x-secret') ||
        req.get('x-webhook-secret') ||
        req.get('moyasar-webhook-secret') ||
        req.get('stripe-signature') ||
        '';

      // For test mode the raw body is the parsed JSON re-stringized deterministically.
      // req.rawBody is captured as a Buffer by the express.json verify hook; cast
      // to string for deterministic parsing/signature checks.
      const rawBuf = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : req.rawBody;
      const rawBody = rawBuf || (req.body !== undefined ? JSON.stringify(req.body) : '');

      let verified = false;
      try {
        verified = provider.verifyWebhookSignature(rawBody, signature);
      } catch (err) {
        logger.error('Webhook signature verification threw:', err);
      }

      if (!verified) {
        logger.warn('Webhook rejected: signature mismatch');
        // Still 200 to avoid retries hammering us, but do nothing.
        return res.status(200).json({ ok: false, error: 'invalid_signature' });
      }

      let parsed;
      try {
        parsed = provider.parseWebhookEvent(rawBody || req.body);
      } catch (err) {
        logger.error('Webhook parse failed:', err);
        return res.status(400).json({ ok: false, error: 'invalid_payload' });
      }

      try {
        await paymentService.applyWebhookEvent({ models, parsedEvent: parsed });
      } catch (err) {
        logger.error('Webhook processing failed:', err);
        // Return 200 so the gateway doesn't retry forever; the event is logged.
        return res.status(200).json({ ok: true, processed: false });
      }

      return res.status(200).json({ ok: true, processed: true });
    }),
  );

  return router;
}
