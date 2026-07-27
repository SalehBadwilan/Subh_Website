/**
 * حالة التاجر — Merchant API (mobile app).
 *
 * Every real HTTP call the MERCHANT portal makes lives here, mapped onto the
 * backend's actual generic-CRUD resources (there are no composite routes like
 * /api/merchant/dashboard on this backend — dashboards are computed
 * client-side from the real lists):
 *
 *   My merchant     GET /api/merchants?limit=100 → match user_id from session
 *   Profile         GET/PUT /api/merchants/:id
 *   Products        GET /api/merchant-products?merchant_id=  PUT /:id (toggle)
 *                   joined client-side with GET /api/products
 *   Orders          GET /api/orders?merchant_id=   (no status-PATCH exists)
 *   Inventory       GET /api/inventory  → joined by SKU  PUT /api/inventory/:id
 *   Subscription    GET/POST /api/merchant-subscriptions   GET /api/plans
 *   Employees       GET/POST/PUT /api/merchant-employees (+ POST /api/users)
 *   Registration    POST /api/merchant-applications  GET ?user_id=
 */
import { apiFetch, type AuthUser, type Pagination } from "./api";
import type { ApiOrder } from "./api-customer";

// --- My merchant -------------------------------------------------------------

export type ApiMerchant = {
  id: string;
  user_id: string;
  commercial_name: string;
  commercial_registration_no: string;
  vat_number: string | null;
  iban: string;
  commission_rate: string | number;
  status: "active" | "suspended" | "terminated";
  created_at?: string;
};

/**
 * Resolve the merchant owned by the signed-in user. The list endpoint has no
 * user_id filter, so we fetch and match client-side. Returns null when the
 * user owns no merchant (→ the UI routes them to the registration form).
 */
export function findMerchantByUser(userId: string): Promise<ApiMerchant | null> {
  return apiFetch<ApiMerchant[]>("/merchants?limit=100").then(
    (r) => r.data.find((m) => m.user_id === userId) ?? null,
  );
}

export function getMerchant(id: string): Promise<ApiMerchant> {
  return apiFetch<ApiMerchant>(`/merchants/${id}`).then((r) => r.data);
}

export function updateMerchant(
  id: string,
  input: Partial<{ commercial_name: string; iban: string }>,
): Promise<ApiMerchant> {
  return apiFetch<ApiMerchant>(`/merchants/${id}`, { method: "PUT", body: input }).then(
    (r) => r.data,
  );
}

// --- Merchant products -------------------------------------------------------

export type ApiMerchantProduct = {
  id: string;
  merchant_id: string;
  product_id: string | null;
  package_id: string | null;
  is_active: boolean;
  created_at?: string;
};

export function getMerchantProducts(
  merchantId: string,
): Promise<{ items: ApiMerchantProduct[]; pagination?: Pagination }> {
  const params = new URLSearchParams({ merchant_id: merchantId, limit: "100" });
  return apiFetch<ApiMerchantProduct[]>(`/merchant-products?${params}`).then((r) => ({
    items: r.data,
    pagination: r.pagination,
  }));
}

/** PUT /api/merchant-products/:id — the only editable field is is_active. */
export function toggleMerchantProduct(id: string, isActive: boolean): Promise<ApiMerchantProduct> {
  return apiFetch<ApiMerchantProduct>(`/merchant-products/${id}`, {
    method: "PUT",
    body: { is_active: isActive },
  }).then((r) => r.data);
}

// --- Merchant orders ---------------------------------------------------------

/**
 * GET /api/merchant/orders — this merchant's orders via the authenticated
 * merchant portal (the backend resolves the merchant from the JWT user, so no
 * merchant_id parameter is needed; it is kept for call-site compatibility).
 */
export function getMerchantOrders(
  _merchantId?: string,
): Promise<{ orders: ApiOrder[]; pagination?: Pagination }> {
  return apiFetch<ApiOrder[]>(`/merchant/orders?limit=100`).then((r) => ({
    orders: r.data,
    pagination: r.pagination,
  }));
}

/** PATCH /api/merchant/orders/:id/status — advance an order's fulfillment state. */
export function updateMerchantOrderStatus(id: string, status: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/merchant/orders/${id}/status`, {
    method: "PATCH",
    body: { status },
  }).then((r) => r.data);
}

// --- Inventory ---------------------------------------------------------------

export type ApiInventory = {
  id: string;
  sellable_type: string;
  sellable_id: string;
  sku: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_threshold: number;

  product: {
    id: string;
    name_ar: string;
    sku: string;
    status: string;
  } | null;

  merchant_product: {
    id: string;
    is_active: boolean;
  } | null;
};

export type ApiEmployeeDashboard = {
  merchant_id: string;

  employee: {
    id: string;
    role: string;
  };

  kpis: {
    orders_today: number;
    fulfilment_queue: number;
    queue_by_status: Record<string, number>;
  };
};

export type ApiEmployeeProduct = {
  id: string;
  name_ar: string;
  sku: string;
  status: string;
  image_url?: string | null;

  merchant_product: {
    id: string;
    is_active: boolean;
  };

  inventory: {
    on_hand: number;
    reserved: number;
    available: number;
    reorder_threshold: number;
  } | null;
};

export type ApiEmployeeReport = {
  merchant_id: string;

  range: {
    from: string;
    to: string;
  };

  group_by: string;

  groups: {
    key: string;
    count: number;
    revenue_sar: number;
  }[];
};

/** The list is only filterable by sku/sellable_type — callers join client-side. */
export function getEmployeeInventory(): Promise<ApiInventory[]> {
  return apiFetch<ApiInventory[]>("/merchant-employee/inventory?limit=100").then((r) => r.data);
}

export function getMerchantInventory(): Promise<ApiInventory[]> {
  return apiFetch<ApiInventory[]>("/merchant/inventory?limit=100").then((r) => r.data);
}

export function getEmployeeDashboard(): Promise<ApiEmployeeDashboard> {
  return apiFetch<ApiEmployeeDashboard>("/merchant-employee/dashboard").then((r) => r.data);
}

export function getEmployeeProducts() {
  return apiFetch<ApiEmployeeProduct[]>("/merchant-employee/products?limit=100").then(
    (r) => r.data,
  );
}

export function getEmployeeOrders() {
  return apiFetch<ApiOrder[]>("/merchant-employee/orders?limit=100").then((r) => r.data);
}

export function updateEmployeeOrderStatus(id: string, status: string) {
  return apiFetch<ApiOrder>(`/merchant-employee/orders/${id}/status`, {
    method: "PATCH",
    body: { status },
  }).then((r) => r.data);
}

export function getEmployeeReports(groupBy: "status" | "day" = "status") {
  return apiFetch<ApiEmployeeReport>(`/merchant-employee/reports?group_by=${groupBy}`).then(
    (r) => r.data,
  );
}

export function updateInventory(
  id: string,
  input: Partial<{ on_hand: number; reserved: number; reorder_threshold: number }>,
): Promise<ApiInventory> {
  return apiFetch<ApiInventory>(`/inventory/${id}`, { method: "PUT", body: input }).then(
    (r) => r.data,
  );
}

// --- Subscription ------------------------------------------------------------

export type ApiPlan = {
  id: string;
  slug: string;
  name_ar: string;
  billing_period: "monthly" | "quarterly" | "yearly";
  price_sar: string | number;
  features: Record<string, unknown> | null;
  is_active: boolean;
};

export function getPlans(): Promise<ApiPlan[]> {
  return apiFetch<ApiPlan[]>("/plans?limit=50").then((r) => r.data);
}

export type ApiSubscription = {
  id: string;
  merchant_id: string;
  plan_id: string;
  status: "active" | "past_due" | "cancelled" | "expired";
  started_at: string;
  current_period_end: string;
};

export function getSubscriptions(merchantId: string): Promise<ApiSubscription[]> {
  const params = new URLSearchParams({ merchant_id: merchantId, limit: "50" });
  return apiFetch<ApiSubscription[]>(`/merchant-subscriptions?${params}`).then((r) => r.data);
}

/** POST /api/merchant-subscriptions — subscribe to a plan starting now (1 month). */
export function createSubscription(merchantId: string, planId: string): Promise<ApiSubscription> {
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
  }).then((r) => r.data);
}

// --- Employees ---------------------------------------------------------------

export type ApiMerchantEmployee = {
  id: string;
  merchant_id: string;
  user_id: string;
  role: "merchant_owner" | "merchant_manager" | "merchant_staff";
  is_active: boolean;
};

export const employeeRoleLabels: Record<ApiMerchantEmployee["role"], string> = {
  merchant_owner: "مالك",
  merchant_manager: "مدير",
  merchant_staff: "موظف",
};

export function getMerchantEmployees(merchantId: string): Promise<ApiMerchantEmployee[]> {
  const params = new URLSearchParams({ merchant_id: merchantId, limit: "100" });
  return apiFetch<ApiMerchantEmployee[]>(`/merchant-employees?${params}`).then((r) => r.data);
}

// 👇 أضف هذه الدالة هنا
export async function findMerchantByEmployeeUser(userId: string): Promise<ApiMerchant | null> {
  const employees = await apiFetch<ApiMerchantEmployee[]>(
    `/merchant-employees?user_id=${userId}`,
  ).then((r) => r.data);

  if (employees.length === 0) {
    return null;
  }

  return getMerchant(employees[0].merchant_id);
}

export function updateMerchantEmployee(
  id: string,
  input: Partial<{ role: ApiMerchantEmployee["role"]; is_active: boolean }>,
): Promise<ApiMerchantEmployee> {
  return apiFetch<ApiMerchantEmployee>(`/merchant-employees/${id}`, {
    method: "PUT",
    body: input,
  }).then((r) => r.data);
}

export function deleteMerchantEmployee(id: string): Promise<void> {
  return apiFetch<void>(`/merchant-employees/${id}`, {
    method: "DELETE",
  }).then(() => {});
}
/**
 * Add an employee in ONE real call: POST /api/merchant-employees with the phone.
 * The backend resolves-or-provisions the user (they activate on first OTP login)
 * AND grants the `merchant_employee` role slug — so on login they are routed to
 * /merchant-employee automatically. Passing a phone that already belongs to a
 * customer works too (the existing user is reused, not duplicated).
 */
export async function addMerchantEmployee({
  merchantId,
  fullName,
  phone,
  email,
  role,
}: {
  merchantId: string;
  fullName: string;
  phone: string;
  email?: string;
  role: ApiMerchantEmployee["role"];
}): Promise<ApiMerchantEmployee & { user?: AuthUser }> {
  return apiFetch<ApiMerchantEmployee & { user?: AuthUser }>("/merchant-employees", {
    method: "POST",
    body: {
      merchant_id: merchantId,
      phone,
      full_name: fullName,
      ...(email ? { email } : {}),
      role,
    },
  }).then((r) => r.data);
}

/** GET /api/users/:id — used to display employee names/phones. */
export function getEmployeeUser(userId: string): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/users/${userId}`).then((r) => r.data);
}

// --- Registration (merchant application) -------------------------------------

export type ApiMerchantApplication = {
  id: string;
  user_id: string;
  commercial_name: string;
  commercial_registration_no: string;
  iban: string;
  vat_number: string | null;
  notes: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

export const applicationStatusLabels: Record<ApiMerchantApplication["status"], string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

export function getMyApplications(userId: string): Promise<ApiMerchantApplication[]> {
  const params = new URLSearchParams({ user_id: userId, limit: "20" });
  return apiFetch<ApiMerchantApplication[]>(`/merchant-applications?${params}`).then((r) => r.data);
}

export function createMerchantApplication(input: {
  user_id: string;
  commercial_name: string;
  commercial_registration_no: string;
  iban: string;
  vat_number?: string;
  notes?: string;
}): Promise<ApiMerchantApplication> {
  return apiFetch<ApiMerchantApplication>("/merchant-applications", {
    method: "POST",
    body: input,
  }).then((r) => r.data);
}
