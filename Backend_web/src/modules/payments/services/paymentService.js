/**
 * Payment service — orchestrates the full payment lifecycle against the
 * existing models (Payment, PaymentEvent, Order, OrderStatusHistory, Invoice,
 * Notification) WITHOUT touching the schema.
 *
 * Flow:
 *   initiatePayment()   customer starts a payment for a pending order → creates
 *                       a Payment(status='initiated') + provider reference.
 *   confirmPayment()    customer confirms client-side (card / 3DS) → records
 *                       the outcome and, on capture, finalizes the order.
 *   applyWebhookEvent() gateway callback (idempotent by event_id) → records a
 *                       PaymentEvent and, on capture, finalizes the order.
 *
 * "Finalize the order" = mark order paid, set paid_at, append a status-history
 * row, issue an invoice, and notify the customer. Idempotent: a re-run on an
 * already-paid order is a no-op.
 *
 * Authorization: callers scope reads by user_id; webhook is server-to-server.
 */
import crypto from 'crypto';

import { ApiError, badRequest, conflict, notFound } from '../../../utils/ApiError.js';
import { getPaymentProvider, getProviderName } from './paymentProvider.js';
import env from '../../../config/env.js';
import sequelize from '../../../config/database.js';

const round2 = (n) => Number(Number(n).toFixed(2));

/**
 * Allowed method values mapped to the Payment.method enum. We accept the
 * customer-facing keys used by the frontend ('card' | 'apple' | 'stc') and map
 * them to the persistence enum.
 */
function resolveMethod(method) {
  switch (String(method || 'card').toLowerCase()) {
    case 'card':
    case 'creditcard':
    case 'credit':
      return 'card';
    case 'apple':
    case 'apple_pay':
      return 'apple_pay';
    case 'stc':
    case 'stc_pay':
    case 'stcpay':
      return 'stc_pay';
    case 'mada':
      return 'mada';
    case 'transfer':
      return 'transfer';
    case 'wallet':
      return 'wallet';
    default:
      throw badRequest('طريقة دفع غير مدعومة', { method });
  }
}

/**
 * Initiate a payment for an order. Idempotent-ish: an existing INITIATED
 * payment for the same order is reused (avoids stacking intents on retry).
 *
 * Returns the payment row + the provider intent (client secret for test mode).
 */
export async function initiatePayment({ models, userId, orderId, method = 'card' }) {
  const { Order, Payment } = models;

  const order = await Order.findByPk(orderId);
  if (!order || order.user_id !== userId) throw notFound('Order');
  if (order.status !== 'pending_payment') {
    // Already paid → 409 with a clear message (frontend can redirect).
    throw conflict('هذا الطلب مدفوع بالفعل أو لا يقبل الدفع', {
      order_status: order.status,
    });
  }

  const persistedMethod = resolveMethod(method);

  // Reuse an existing initiated payment for this order if present (retry case).
  let payment = await Payment.findOne({
    where: { order_id: order.id, status: 'initiated' },
    order: [['created_at', 'DESC']],
  });

  const provider = getPaymentProvider();

  if (!payment) {
    payment = await Payment.create({
      order_id: order.id,
      provider: getProviderName(),
      method: persistedMethod,
      amount_sar: order.total_sar,
      currency: order.currency || 'SAR',
      status: 'initiated',
    });
  } else if (payment.provider !== provider.name) {
    // Provider changed since the last attempt — start a fresh payment row.
    payment = await Payment.create({
      order_id: order.id,
      provider: provider.name,
      method: persistedMethod,
      amount_sar: order.total_sar,
      currency: order.currency || 'SAR',
      status: 'initiated',
    });
  }

  // Create the provider intent.
  const intent = await provider.createIntent({
    amount: order.total_sar,
    currency: order.currency || 'SAR',
    description: `Subh order ${order.number}`,
    callbackUrl: env.payment.callbackUrl,
    metadata: { orderId: order.id, paymentId: payment.id, orderNumber: order.number },
  });

  // Persist the provider reference (UNIQUE) if not yet set.
  if (intent.providerReference && !payment.provider_reference) {
    try {
      await payment.update({ provider_reference: intent.providerReference });
    } catch (err) {
      // If another payment already holds this reference (rare replay), reuse it.
      const existing = await Payment.findOne({
        where: { provider_reference: intent.providerReference },
      });
      if (existing && existing.id !== payment.id) payment = existing;
    }
  }

  return {
    payment,
    intent: {
      provider: provider.name,
      provider_reference: payment.provider_reference || intent.providerReference,
      client_secret: intent.clientSecret || null,
      status: intent.status,
      publishable_key:
        provider.name === 'moyasar' ? env.payment.moyasar.publishableKey || null : null,
    },
  };
}

/**
 * Confirm a payment client-side (card details / token / 3DS result).
 *
 * In test mode this is the moment capture happens; in real-provider mode it
 * records the confirmation and the webhook drives the final capture. Either
 * way the order is finalized atomically on capture.
 */
export async function confirmPayment({ models, userId, paymentId, source }) {
  const { Order, Payment } = models;

  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw notFound('Payment');

  const order = await Order.findByPk(payment.order_id);
  if (!order || order.user_id !== userId) throw notFound('Payment');

  if (payment.status === 'captured') return { payment, alreadyPaid: true };
  if (!payment.provider_reference) {
    throw badRequest('لم يبدأ الدفع لهذا الطلب بعد');
  }

  const provider = getPaymentProvider();
  const result = await provider.confirm(payment.provider_reference, { source });

  await payment.update({ status: result.status, captured_at: result.status === 'captured' ? new Date() : null });

  if (result.status === 'captured') {
    await finalizePaidOrder({ models, order, payment });
  }

  return { payment, status: result.status };
}

/**
 * Apply a gateway webhook event. Idempotent by event_id (UNIQUE in
 * payment_events). Records the raw event, updates the payment status, and
 * finalizes the order on capture.
 *
 * Returns { created: boolean, payment, status }.
 */
export async function applyWebhookEvent({ models, parsedEvent }) {
  const { Payment, PaymentEvent } = models;

  // Idempotency: if this event_id was already processed, stop here.
  const existing = await PaymentEvent.findOne({
    where: { event_id: parsedEvent.eventId },
  });
  if (existing) {
    return { created: false, alreadyProcessed: true, event: existing };
  }

  // Resolve the payment by provider reference.
  const payment = await Payment.findOne({
    where: { provider_reference: parsedEvent.providerReference },
  });
  if (!payment) {
    // Record the orphan event so nothing is lost, but don't mutate anything.
    const orphan = await PaymentEvent.create({
      payment_id: null,
      event_id: parsedEvent.eventId,
      event_type: parsedEvent.eventType,
      status: parsedEvent.status,
      payload: { ...parsedEvent.raw, _orphan: true },
      received_at: new Date(),
    }).catch(() => null);
    return { created: !!orphan, orphan: true };
  }

  // Record the event (payment_id filled). The unique event_id guards replays.
  const event = await PaymentEvent.create({
    payment_id: payment.id,
    event_id: parsedEvent.eventId,
    event_type: parsedEvent.eventType,
    status: parsedEvent.status,
    payload: parsedEvent.raw,
    received_at: new Date(),
  });

  // Advance the payment status. Never regress: once captured, stays captured.
  const order = ['captured', 'refunded', 'disputed'].includes(payment.status)
    ? null
    : await models.Order.findByPk(payment.order_id);

  const previousStatus = payment.status;
  if (parsedEvent.status !== 'initiated') {
    await payment.update({
      status: parsedEvent.status,
      captured_at: parsedEvent.status === 'captured' ? new Date() : payment.captured_at,
    });
  }

  if (parsedEvent.status === 'captured' && order && order.status === 'pending_payment') {
    await finalizePaidOrder({ models, order, payment });
  }

  return { created: true, event, payment, previousStatus, status: parsedEvent.status };
}

/**
 * Finalize an order as PAID. Idempotent: skips if the order is already paid.
 * Steps (all inside one transaction):
 *   - order.status = 'paid', paid_at = now
 *   - OrderStatusHistory entry
 *   - Invoice row (one per order — UNIQUE)
 *   - Notification to the customer
 */
export async function finalizePaidOrder({ models, order, payment }) {
  const { Order, OrderStatusHistory, Invoice, Notification } = models;

  // Reload to avoid stale status.
  const fresh = await Order.findByPk(order.id);
  if (!fresh || fresh.status === 'paid') return;

  await sequelize.transaction(async (t) => {
    await fresh.update(
      { status: 'paid', paid_at: new Date() },
      { transaction: t },
    );

    await OrderStatusHistory.create(
      {
        order_id: fresh.id,
        from_status: 'pending_payment',
        to_status: 'paid',
        comment_ar: `تمت عملية الدفع عبر ${payment.provider} (${payment.method})`,
        actor_id: fresh.user_id,
      },
      { transaction: t },
    );

    // Issue the invoice if not already present (UNIQUE on order_id).
    const existingInvoice = await Invoice.findOne({
      where: { order_id: fresh.id },
      transaction: t,
    });
    if (!existingInvoice) {
      const buyer = await models.User.findByPk(fresh.user_id, {
        attributes: ['id', 'full_name', 'email'],
        transaction: t,
      });
      await Invoice.create(
        {
          order_id: fresh.id,
          number: `INV-${fresh.number}`,
          issued_at: new Date(),
          buyer_name: buyer ? buyer.full_name : 'عميل صبح',
          buyer_vat_number: null,
          subtotal_sar: round2(fresh.subtotal_sar),
          vat_sar: round2(fresh.vat_sar),
          total_sar: round2(fresh.total_sar),
          pdf_url: null,
        },
        { transaction: t },
      );
    }

    // Notify the customer in-app.
    await Notification.create(
      {
        user_id: fresh.user_id,
        channel: 'in_app',
        title_ar: 'تم إتمام الدفع',
        body_ar: `تم تأكيد دفع طلبك ${fresh.number} بمبلغ ${round2(fresh.total_sar)} ر.س.`,
        payload: { order_id: fresh.id, payment_id: payment.id, amount: round2(fresh.total_sar) },
        is_read: false,
      },
      { transaction: t },
    );
  });
}

/**
 * Safe projection of a Payment for API responses (no secrets).
 */
export function serializePayment(p) {
  return {
    id: p.id,
    order_id: p.order_id,
    provider: p.provider,
    provider_reference: p.provider_reference,
    method: p.method,
    amount_sar: Number(p.amount_sar),
    currency: p.currency,
    status: p.status,
    captured_at: p.captured_at,
    created_at: p.created_at,
  };
}

export default {
  initiatePayment,
  confirmPayment,
  applyWebhookEvent,
  finalizePaidOrder,
  serializePayment,
};
