/**
 * حالة التاجر — Merchant API (بوابة Stage-2 المباشرة، وليس نمط تجميع الويب القديم).
 *
 *   Profile      GET /merchant/profile (403: not_merchant|merchant_suspended|merchant_terminated)
 *                PUT /merchants/:id {commercial_name?, iban?}
 *   Dashboard    GET /merchant/dashboard
 *   Products     GET /merchant/products   PUT /merchant-products/:id {is_active}
 *   Orders       GET /merchant/orders (قراءة فقط من الموبايل)
 *   Inventory    GET /merchant/inventory   PUT /inventory/:id
 *   Sales        GET /merchant/sales-summary
 *   Settlements  GET /merchant/settlements
 *   Subscription GET /merchant/subscription  POST /merchant/subscription/change-request
 *   Employees    GET/POST/PUT /merchant/employees  PATCH .../toggle-active
 *
 * كل الدوال تُرجع ApiResult<T> عبر apiFetch في api.ts.
 */
import { apiFetch, type ApiProductImageEntry, type ApiResult } from "./api";

// --- ملف التاجر + الحارس -------------------------------------------------------------

export type ApiMerchant = {
  id: string;
  status: "active" | "suspended" | "terminated";
  commercial_name: string;
  commercial_registration_no: string;
  vat_number: string | null;
  /** مقنّع من الخادم (****XXXX). */
  iban: string;
  commission_rate: number | null;
  rating_avg: number | null;
  rating_count: number;
  approved_at: string | null;
  created_at: string;
};

export type MerchantProfileResult = {
  merchant: ApiMerchant;
  user: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    is_active: boolean;
  } | null;
};

export function getMerchantProfile(): Promise<
  ApiResult<MerchantProfileResult>
> {
  return apiFetch<MerchantProfileResult>("/merchant/profile");
}

export function updateMerchant(
  id: string,
  input: Partial<{ commercial_name: string; iban: string }>,
): Promise<ApiResult<ApiMerchant>> {
  return apiFetch<ApiMerchant>(`/merchants/${id}`, {
    method: "PUT",
    body: input,
  });
}

// --- لوحة التحكم -----------------------------------------------------------------------

export type MerchantDashboard = {
  merchant_id: string;
  merchant_status: string;
  commercial_name: string;
  kpis: {
    total_orders: number;
    orders_by_status: Record<string, number>;
    revenue_sar: number;
    fulfilled_orders: number;
    active_listings: number;
    pending_update_requests: number;
    low_stock_skus: number;
  };
};

export function getMerchantDashboard(): Promise<ApiResult<MerchantDashboard>> {
  return apiFetch<MerchantDashboard>("/merchant/dashboard");
}

// --- المنتجات (تفعيل/تعطيل فقط — لا إنشاء من بوابة التاجر) -----------------------------

/** يطابق serializeProduct في الباك إند حرفيًا (src/modules/merchant/utils/serializers.js). */
export type ApiMerchantProductRow = {
  id: string;
  merchant_product_id: string | null;
  is_active: boolean;
  sku: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  price_sar: number;
  vat_rate: number;
  status: "draft" | "active" | "archived";
  category_id: string | null;
  weight_grams: number | null;
  is_package: boolean;
  image_url: string | null;
  images: ApiProductImageEntry[];
  inventory: {
    on_hand: number;
    reserved: number;
    available: number;
    reorder_threshold: number;
  } | null;
};

export function getMyProducts(
  opts: {
    status?: "active" | "inactive";
    q?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<ApiResult<ApiMerchantProductRow[]>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 50),
  });
  if (opts.status) params.set("status", opts.status);
  if (opts.q) params.set("q", opts.q);
  return apiFetch<ApiMerchantProductRow[]>(`/merchant/products?${params}`);
}

export function toggleMerchantProduct(
  merchantProductId: string,
  isActive: boolean,
): Promise<ApiResult<{ id: string; is_active: boolean }>> {
  return apiFetch<{ id: string; is_active: boolean }>(
    `/merchant-products/${merchantProductId}`,
    {
      method: "PUT",
      body: { is_active: isActive },
    },
  );
}

// --- الطلبات (قراءة فقط من الموبايل) ----------------------------------------------------

/** يطابق serializeOrder في الباك إند حرفيًا. */
export type ApiMerchantOrder = {
  id: string;
  number: string;
  status: string;
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
  customer: { id: string; full_name: string; phone: string } | null;
  items: {
    id: string;
    product_id: string | null;
    package_id: string | null;
    name_snapshot_ar: string;
    sku_snapshot: string;
    quantity: number;
    unit_price_sar: number;
    vat_rate: number;
    line_total_sar: number;
  }[];
};

/** حالات فعلية مسموحة للتاجر عبر PATCH /merchant/orders/:id/status (للعرض فقط — لا نستخدمها من الموبايل). */
export const MERCHANT_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export function getMyOrders(
  opts: {
    status?: string;
    q?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<ApiResult<ApiMerchantOrder[]>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 50),
  });
  if (opts.status) params.set("status", opts.status);
  if (opts.q) params.set("q", opts.q);
  return apiFetch<ApiMerchantOrder[]>(`/merchant/orders?${params}`);
}

// --- المخزون -------------------------------------------------------------------------

/** يطابق serializeInventory في الباك إند حرفيًا. */
export type ApiMerchantInventoryRow = {
  id: string;
  sku: string;
  sellable_type: string;
  sellable_id: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_threshold: number;
  product: { id: string; name_ar: string; sku: string; status: string } | null;
  merchant_product: { id: string; is_active: boolean } | null;
};

export function getMyInventory(
  opts: {
    q?: string;
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<ApiResult<ApiMerchantInventoryRow[]>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 50),
  });
  if (opts.q) params.set("q", opts.q);
  if (opts.lowStockOnly) params.set("low_stock", "true");
  return apiFetch<ApiMerchantInventoryRow[]>(`/merchant/inventory?${params}`);
}

export function updateInventory(
  id: string,
  input: Partial<{
    on_hand: number;
    reserved: number;
    reorder_threshold: number;
  }>,
): Promise<ApiResult<ApiMerchantInventoryRow>> {
  return apiFetch<ApiMerchantInventoryRow>(`/inventory/${id}`, {
    method: "PUT",
    body: input,
  });
}

// --- المبيعات ------------------------------------------------------------------------

export type MerchantSalesSummary = {
  merchant_id: string;
  range: { from: string; to: string };
  totals: {
    orders: number;
    gross_revenue_sar: number;
    commission_rate: number;
    commission_sar: number;
    net_payable_sar: number;
  };
  by_status: Record<string, { count: number; total_sar: number }>;
  daily: { day: string; revenue_sar: number; orders: number }[];
};

export function getSalesSummary(
  opts: { from?: string; to?: string } = {},
): Promise<ApiResult<MerchantSalesSummary>> {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  const qs = params.toString();
  return apiFetch<MerchantSalesSummary>(
    `/merchant/sales-summary${qs ? `?${qs}` : ""}`,
  );
}

// --- التسويات ------------------------------------------------------------------------

export type ApiSettlement = {
  id: string;
  period_from: string;
  period_to: string;
  gross_sales_sar: number;
  commission_sar: number;
  refunds_sar: number;
  net_payable_sar: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "failed";
  paid_at: string | null;
  reference: string;
  created_at: string;
};

export type SettlementsSummary = {
  gross_sales_sar: number;
  commission_sar: number;
  refunds_sar: number;
  net_payable_sar: number;
};

/**
 * الباك إند يضع `summary` كحقل شقيق لـ `data` (وليس متداخلاً بداخله) — يصل عبر
 * ApiResult.summary (bag عام)؛ استخدم `readSettlementsSummary` لقراءته بنوعه الدقيق.
 */
export function getSettlements(
  opts: {
    status?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<ApiResult<ApiSettlement[]>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 50),
  });
  if (opts.status) params.set("status", opts.status);
  return apiFetch<ApiSettlement[]>(`/merchant/settlements?${params}`);
}

/** يقرأ res.summary من نتيجة getSettlements بنوعه الصحيح (بدل `unknown`). */
export function readSettlementsSummary(summary: unknown): SettlementsSummary {
  const s = (summary ?? {}) as Partial<SettlementsSummary>;
  return {
    gross_sales_sar: s.gross_sales_sar ?? 0,
    commission_sar: s.commission_sar ?? 0,
    refunds_sar: s.refunds_sar ?? 0,
    net_payable_sar: s.net_payable_sar ?? 0,
  };
}

// --- الاشتراك (طلب مراجعة — لا اشتراك فوري ذاتي) --------------------------------------

export type ApiPlan = {
  id: string;
  slug: string;
  name_ar: string;
  billing_period: "monthly" | "quarterly" | "yearly";
  price_sar: number;
  features: Record<string, unknown> | null;
  is_active: boolean;
};

export type PendingPlanChangeRequest = {
  id: string;
  requested_plan_id: string;
  change_type: string;
  status: string;
  created_at: string;
};

export type MerchantSubscriptionState = {
  id: string | null;
  status: string | null;
  started_at: string | null;
  current_period_end: string | null;
  plan: ApiPlan | null;
  pending_change_request: PendingPlanChangeRequest | null;
  available_plans: ApiPlan[] | null;
};

export function getMySubscription(): Promise<
  ApiResult<MerchantSubscriptionState>
> {
  return apiFetch<MerchantSubscriptionState>("/merchant/subscription");
}

export type ApiSubscription = {
  id: string;
  merchant_id: string;
  plan_id: string;
  started_at: string;
  current_period_end: string;
  status: "active" | "expired" | "cancelled";
};

export function createSubscription(
  merchantId: string,
  planId: string,
): Promise<ApiResult<ApiSubscription>> {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  return apiFetch<ApiSubscription>("/merchant-subscriptions", {
    method: "POST",
    body: {
      merchant_id: merchantId,
      plan_id: planId,
      started_at: now.toISOString(),
      current_period_end: end.toISOString(),
      status: "active",
    },
  });
}
export function requestPlanChange(
  requestedPlanId: string,
  changeType: "upgrade" | "downgrade" | "change_period" = "change_period",
  reasonAr?: string,
): Promise<ApiResult<unknown>> {
  return apiFetch<unknown>("/merchant/subscription/change-request", {
    method: "POST",
    body: {
      requested_plan_id: requestedPlanId,
      change_type: changeType,
      reason_ar: reasonAr,
    },
  });
}

// --- الموظفون ------------------------------------------------------------------------

export type ApiMerchantEmployee = {
  id: string;
  merchant_id: string;
  user_id: string;
  role: "merchant_owner" | "merchant_manager" | "merchant_staff";
  is_active: boolean;
  permissions: Record<string, boolean> | null;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    is_active: boolean;
  } | null;
};

export const employeeRoleLabels: Record<ApiMerchantEmployee["role"], string> = {
  merchant_owner: "مالك",
  merchant_manager: "مدير",
  merchant_staff: "موظف",
};

export function getMyEmployees(
  opts: {
    role?: string;
    isActive?: boolean;
    q?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<ApiResult<ApiMerchantEmployee[]>> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 100),
  });
  if (opts.role) params.set("role", opts.role);
  if (opts.isActive != null) params.set("is_active", String(opts.isActive));
  if (opts.q) params.set("q", opts.q);
  return apiFetch<ApiMerchantEmployee[]>(`/merchant/employees?${params}`);
}

/** auto-provision بالجوال — الباك إند يُنشئ المستخدم ويمنحه دور merchant_employee. */
export function addEmployee(input: {
  phone: string;
  fullName?: string;
  email?: string;
  role: "merchant_manager" | "merchant_staff";
}): Promise<ApiResult<ApiMerchantEmployee>> {
  return apiFetch<ApiMerchantEmployee>("/merchant/employees", {
    method: "POST",
    body: {
      phone: input.phone,
      full_name: input.fullName,
      email: input.email,
      role: input.role,
    },
  });
}

export function updateEmployeeRole(
  id: string,
  role: "merchant_manager" | "merchant_staff",
): Promise<ApiResult<ApiMerchantEmployee>> {
  return apiFetch<ApiMerchantEmployee>(`/merchant/employees/${id}`, {
    method: "PUT",
    body: { role },
  });
}

/** تعطيل/تفعيل فقط — لا DELETE في Stage-2 (يحافظ على السجل). */
export function toggleEmployeeActive(
  id: string,
): Promise<ApiResult<ApiMerchantEmployee>> {
  return apiFetch<ApiMerchantEmployee>(
    `/merchant/employees/${id}/toggle-active`,
    { method: "PATCH" },
  );
}
export function getPlans() {
  return apiFetch<ApiPlan[]>("/plans?limit=50");
}
