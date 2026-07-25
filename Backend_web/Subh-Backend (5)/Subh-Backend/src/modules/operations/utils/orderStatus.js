/**
 * Order state machine for the Operations APIs (Stage 4).
 *
 * Operations (warehouse staff / fulfilment) owns the FULFILMENT half of the
 * order lifecycle — after payment is captured and until delivery. This is a
 * STRICT superset of the merchant's allowed transitions: operations also owns
 * marking an order delivered (carrier confirmation) and can reverse an order to
 * cancelled/returned when a fulfilment exception occurs.
 *
 * Allowed operations-driven transitions:
 *
 *   paid            → preparing         (start packing — overlaps merchant)
 *   preparing       → ready_to_ship
 *   preparing       → shipped            (skip ready if same-day)
 *   ready_to_ship   → shipped
 *   shipped         → delivered          (carrier confirms delivery)
 *   paid/preparing/ready_to_ship → cancelled   (ops cancels a fulfilment)
 *   shipped/delivered → returned         (returned by customer / failed delivery)
 *
 * Anything else (e.g. going back from delivered → shipped, or jumping from
 * pending_payment → delivered) is rejected with 409.
 *
 * `pending_payment → cancelled` is owned by the payment layer (cancelled on
 * non-payment), so operations is intentionally NOT allowed to cancel an unpaid
 * order. `paid → delivered` is also forbidden — fulfilment must pass through the
 * shipment step so a Shipment row + tracking exist.
 */
const ALLOWED_TRANSITIONS = {
  paid: ['preparing', 'cancelled'],
  preparing: ['ready_to_ship', 'shipped', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  // terminal / non-operations states: no outgoing transitions owned by ops.
  pending_payment: [],
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
 * The set of statuses Operations is allowed to MOVE an order INTO via
 * PATCH /api/operations/orders/:id/status. Used for input validation.
 */
export const OPERATIONS_TARGET_STATUSES = [
  'preparing',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export default { canTransition, OPERATIONS_TARGET_STATUSES };
