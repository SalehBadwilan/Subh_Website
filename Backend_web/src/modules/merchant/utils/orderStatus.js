/**
 * Order state machine for the merchant/merchant-employee APIs.
 *
 * A merchant (or its employee) advances an order through the fulfilment
 * lifecycle. The transitions allowed here are a STRICT subset of the full
 * order_status enum — we only permit the merchant-controlled part. Payment
 * capture and cancellation-on-non-payment are out of the merchant's hands in
 * the MVP and remain owned by the payment/operations layer.
 *
 * Allowed merchant-driven transitions:
 *
 *   paid          → preparing        (merchant starts packing)
 *   preparing     → ready_to_ship
 *   ready_to_ship → shipped          (handed to carrier)
 *   preparing     → shipped          (skip ready if same-day)
 *
 * Anything else (e.g. going back from shipped → preparing, or touching
 * pending_payment / delivered / cancelled / returned) is rejected with 409.
 *
 * `delivered` is set by the shipment/carrier layer, NOT the merchant — so it is
 * intentionally absent from the merchant's allowed targets.
 */
const ALLOWED_TRANSITIONS = {
  paid: ['preparing'],
  preparing: ['ready_to_ship', 'shipped'],
  ready_to_ship: ['shipped'],
  // terminal / non-merchant states: no outgoing transitions owned by merchant.
  pending_payment: [],
  shipped: [],
  delivered: [],
  cancelled: [],
  returned: [],
};

/**
 * Validate a proposed status transition. Returns true if allowed.
 * Throws nothing — caller decides how to react.
 */
export function canTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

/**
 * The set of statuses a merchant is allowed to MOVE an order INTO via the
 * PATCH /orders/:id/status endpoint. Used for input validation.
 */
export const MERCHANT_TARGET_STATUSES = ['preparing', 'ready_to_ship', 'shipped'];

export default { canTransition, MERCHANT_TARGET_STATUSES };
