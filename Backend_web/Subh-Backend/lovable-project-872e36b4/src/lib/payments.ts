/**
 * Client-side helpers for the Subh payment flow.
 *
 * These wrap the REAL backend endpoints (no mock data):
 *
 *   1. POST /api/orders              create the order (stock-checked, txn-safe)
 *   2. POST /api/payments/initiate   start a payment for that order
 *   3. POST /api/payments/:id/confirm confirm the payment client-side
 *
 * The backend provider is 'test' by default (simulated capture, no external
 * keys) and switches to Moyasar automatically when MOYASAR_SECRET_KEY is set.
 * In test mode, step 3 completes the capture synchronously and the order is
 * marked paid. With a real provider, step 3 hands off to the gateway and the
 * webhook (POST /api/webhooks/payments) finalizes the order.
 *
 * Everything goes through the shared api-client (apiRequest), so the bearer
 * token and base URL are handled consistently with the rest of the app.
 */
import { apiRequest, type ApiOk } from "@/lib/api-client";

/** A single line sent to the backend when creating an order. */
export type OrderLineInput = {
  product_id: string;
  merchant_id: string;
  quantity: number;
};

/** Backend order shape returned by POST /api/orders and GET /api/orders/:id. */
export type BackendOrder = {
  id: string;
  number: string;
  status:
    | "pending_payment"
    | "paid"
    | "preparing"
    | "ready_to_ship"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned";
  currency: string;
  subtotal_sar: number;
  discount_sar: number;
  shipping_sar: number;
  vat_sar: number;
  total_sar: number;
  notes_ar: string | null;
  placed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  shipping_address_id: string;
  items: Array<{
    id: string;
    product_id: string | null;
    package_id: string | null;
    merchant_id: string;
    name_snapshot_ar: string;
    sku_snapshot: string;
    quantity: number;
    unit_price_sar: number;
    line_total_sar: number;
  }>;
};

/** Payment row as returned by the payments endpoints. */
export type BackendPayment = {
  id: string;
  order_id: string;
  provider: string;
  provider_reference: string | null;
  method: string;
  amount_sar: number;
  currency: string;
  status: "initiated" | "authorized" | "captured" | "failed" | "refunded" | "disputed";
  captured_at: string | null;
  created_at: string;
};

/** Intent returned by /api/payments/initiate. */
export type PaymentIntent = {
  provider: string;
  provider_reference: string;
  client_secret: string | null;
  status: string;
  publishable_key: string | null;
};

export type CreateOrderResponse = ApiOk<BackendOrder>;
export type InitiatePaymentResponse = ApiOk<{ payment: BackendPayment; intent: PaymentIntent }>;
export type ConfirmPaymentResponse = ApiOk<{
  payment: BackendPayment;
  status: string;
  already_paid: boolean;
}>;

/**
 * Create an order for the authenticated user. The backend verifies stock
 * atomically and returns 409 if any line is short.
 */
export function createOrder(input: {
  shipping_address_id: string;
  items: OrderLineInput[];
  notes?: string;
}): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>("/api/orders", {
    method: "POST",
    body: input,
  });
}

/**
 * Initiate a payment for a pending order. Returns the payment row + the
 * provider intent (client_secret in test mode).
 */
export function initiatePayment(input: {
  order_id: string;
  method?: "card" | "apple" | "stc" | "mada";
}): Promise<InitiatePaymentResponse> {
  return apiRequest<InitiatePaymentResponse>("/api/payments/initiate", {
    method: "POST",
    body: input,
  });
}

/**
 * Confirm a payment client-side. In test mode this captures synchronously and
 * the order is marked paid. `source` is provider-specific (card token, last4,
 * etc.); the test provider uses last4 to simulate success/decline.
 */
export function confirmPayment(input: {
  payment_id: string;
  source?: { last4?: string; token?: string };
}): Promise<ConfirmPaymentResponse> {
  return apiRequest<ConfirmPaymentResponse>(
    `/api/payments/${input.payment_id}/confirm`,
    {
      method: "POST",
      body: { source: input.source },
    },
  );
}

/**
 * Run the full checkout flow end-to-end against the backend:
 * create order → initiate payment → confirm payment.
 *
 * Returns the final payment + order id on success; throws ApiError on any
 * failure (stock shortage, payment decline, network).
 *
 * `card` is optional: in test mode passing { last4: "0002" } simulates a
 * decline so the UI can demonstrate the failure path.
 */
export async function checkoutWithBackend(input: {
  shippingAddressId: string;
  lines: OrderLineInput[];
  method?: "card" | "apple" | "stc" | "mada";
  card?: { last4?: string };
  notes?: string;
}): Promise<{ orderId: string; orderNumber: string; paymentId: string; status: string }> {
  // 1) create order
  alert(JSON.stringify(input.lines, null, 2));
  const orderRes = await createOrder({
    shipping_address_id: input.shippingAddressId,
    items: input.lines,
    notes: input.notes,
  });

  // 2) initiate payment
  const initRes = await initiatePayment({
    order_id: orderRes.data.id,
    method: input.method || "card",
  });

  // 3) confirm payment
  const confirmRes = await confirmPayment({
    payment_id: initRes.data.payment.id,
    source: input.card ? { last4: input.card.last4 } : undefined,
  });

  return {
    orderId: orderRes.data.id,
    orderNumber: orderRes.data.number,
    paymentId: confirmRes.data.payment.id,
    status: confirmRes.data.status,
  };
}

/**
 * Quick guard: the backend only accepts real product UUIDs. The prototype's
 * mock product ids (p1, b1, ...) are NOT valid backend ids, so we detect them
 * up front and surface a clear message instead of a confusing 404.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidBackendProductId(id: string): boolean {
  return UUID_RE.test(id);
}
