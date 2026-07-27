/**
 * حالة الأدمن — Admin API.
 *
 * Wraps the backend's secured admin module (/api/admin/*). Every endpoint here
 * requires a JWT whose user holds the `admin` role (full access) or
 * `admin_employee` (read-only — writes return 403 forbidden_read_only).
 * apiFetch() attaches the Bearer token automatically from the session.
 *
 *   Dashboard      GET   /api/admin/dashboard
 *   Products       GET/POST /api/admin/products, PUT /:id,
 *                  PATCH /:id/toggle-active,
 *                  POST /:id/assign, DELETE /:id/assign/:merchantId
 *   Categories     GET/POST /api/admin/categories, PUT /:id, PATCH /:id/toggle-active
 *   Users          GET /api/admin/users, PATCH /:id/toggle-active
 *   Merchants      GET /api/admin/merchants (IBAN masked server-side)
 *   Applications   GET /api/admin/merchant-applications, POST /:id/approve|reject
 *
 * Product images + stock use the shared catalog resources:
 *   POST /api/product-images/upload   (multipart: image, product_id, is_primary)
 *   GET  /api/product-images?product_id=
 *   POST /api/inventory               (idempotent "set stock")
 */
import { apiFetch, apiUpload, type Pagination } from "./api";

// --- Dashboard ---------------------------------------------------------------

export type AdminKpis = {
  total_merchants: number;
  merchants_by_status: Record<string, number>;
  pending_applications: number;
  total_products: number;
  products_by_status: Record<string, number>;
  total_packages: number;
  total_users: number;
  total_orders: number;
  orders_by_status: Record<string, number>;
  gmv_sar: number;
  fulfilled_orders: number;
};

export function getAdminDashboard(): Promise<AdminKpis> {
  return apiFetch<{ kpis: AdminKpis }>("/admin/dashboard").then((r) => r.data.kpis);
}

// --- Products ----------------------------------------------------------------

export type AdminProduct = {
  id: string;
  category_id: string | null;
  sku: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  price_sar: number;
  vat_rate: number;
  status: "draft" | "active" | "archived";
  weight_grams: number | null;
  is_package: boolean;
  created_at: string;
  updated_at: string;
  category: { id: string; slug: string; name_ar: string } | null;
  merchants_count: number;
};

export type AdminProductInput = {
  sku: string;
  slug: string;
  name_ar: string;
  price_sar: number;
  category_id?: string | null;
  description_ar?: string;
  status?: "draft" | "active" | "archived";
};

export function getAdminProducts({
  q,
  status,
  categoryId,
  page = 1,
  limit = 50,
}: {
  q?: string;
  status?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{
  products: AdminProduct[];
  pagination?: Pagination;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (categoryId) params.set("category_id", categoryId);
  return apiFetch<AdminProduct[]>(`/admin/products?${params}`).then((r) => ({
    products: r.data,
    pagination: r.pagination,
  }));
}

export function createAdminProduct(input: AdminProductInput): Promise<AdminProduct> {
  return apiFetch<AdminProduct>("/admin/products", { method: "POST", body: input }).then(
    (r) => r.data,
  );
}

export function updateAdminProduct(
  id: string,
  input: Partial<AdminProductInput>,
): Promise<AdminProduct> {
  return apiFetch<AdminProduct>(`/admin/products/${id}`, { method: "PUT", body: input }).then(
    (r) => r.data,
  );
}

export function toggleAdminProduct(id: string): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(`/admin/products/${id}/toggle-active`, {
    method: "PATCH",
  }).then((r) => r.data);
}

export function assignProductToMerchant(productId: string, merchantId: string): Promise<void> {
  return apiFetch<unknown>(`/admin/products/${productId}/assign`, {
    method: "POST",
    body: { merchant_id: merchantId },
  }).then(() => undefined);
}

export function unassignProductFromMerchant(productId: string, merchantId: string): Promise<void> {
  return apiFetch<unknown>(`/admin/products/${productId}/assign/${merchantId}`, {
    method: "DELETE",
  }).then(() => undefined);
}

// --- Product images ----------------------------------------------------------

export type AdminProductImage = {
  id: string;
  product_id: string | null;
  image_url: string;
  alt_text_ar: string | null;
  sort_order: number;
  is_primary: boolean;
};

/** Multipart upload of one image file, linked to a product as its primary image. */
export function uploadProductImage({
  file,
  productId,
  altText,
  isPrimary = true,
}: {
  file: File;
  productId: string;
  altText?: string;
  isPrimary?: boolean;
}): Promise<AdminProductImage> {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("product_id", productId);
  fd.append("is_primary", String(isPrimary));
  if (altText) fd.append("alt_text_ar", altText);
  return apiUpload<AdminProductImage>("/product-images/upload", fd);
}

export function getProductImages(productId?: string): Promise<AdminProductImage[]> {
  const params = new URLSearchParams({ limit: "100" });
  if (productId) params.set("product_id", productId);
  return apiFetch<AdminProductImage[]>(`/product-images?${params}`).then((r) => r.data);
}

export function deleteProductImage(id: string): Promise<void> {
  return apiFetch<unknown>(`/product-images/${id}`, { method: "DELETE" }).then(() => undefined);
}

// --- Inventory (stock) -------------------------------------------------------

export type ApiInventory = {
  id: string;
  sellable_type: "product" | "package";
  sellable_id: string;
  sku: string;
  on_hand: number;
  reserved: number;
  reorder_threshold: number;
};

/** Idempotent "set stock": creates the inventory row or updates on_hand. */
export function setProductStock({
  productId,
  sku,
  onHand,
}: {
  productId: string;
  sku: string;
  onHand: number;
}): Promise<ApiInventory> {
  return apiFetch<ApiInventory>("/inventory", {
    method: "POST",
    body: { sellable_type: "product", sellable_id: productId, sku, on_hand: onHand },
  }).then((r) => r.data);
}

export function getProductStock(productId: string): Promise<ApiInventory | null> {
  const params = new URLSearchParams({
    sellable_type: "product",
    sellable_id: productId,
    limit: "1",
  });
  return apiFetch<ApiInventory[]>(`/inventory?${params}`).then((r) => r.data[0] ?? null);
}

export function getAllInventory(): Promise<ApiInventory[]> {
  return apiFetch<ApiInventory[]>("/inventory?limit=100").then((r) => r.data);
}

// --- Merchant ↔ product links ------------------------------------------------

export type MerchantProductLink = {
  id: string;
  merchant_id: string;
  product_id: string | null;
  package_id: string | null;
  is_active: boolean;
};

/** All assignment rows (no product_id filter exists) — callers group client-side. */
export function getMerchantProductLinks() {
  return apiFetch<MerchantProductLink[]>("/admin/products/merchant-products?limit=100").then(
    (r) => r.data,
  );
}

// --- Categories --------------------------------------------------------------

export type AdminCategory = {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function getAdminCategories(): Promise<AdminCategory[]> {
  return apiFetch<AdminCategory[]>("/admin/categories?limit=100").then((r) => r.data);
}

export function createAdminCategory(input: {
  slug: string;
  name_ar: string;
  sort_order?: number;
}): Promise<AdminCategory> {
  return apiFetch<AdminCategory>("/admin/categories", { method: "POST", body: input }).then(
    (r) => r.data,
  );
}

export function updateAdminCategory(
  id: string,
  input: Partial<{ slug: string; name_ar: string; sort_order: number }>,
): Promise<AdminCategory> {
  return apiFetch<AdminCategory>(`/admin/categories/${id}`, { method: "PUT", body: input }).then(
    (r) => r.data,
  );
}

export function toggleAdminCategory(id: string): Promise<{ id: string; is_active: boolean }> {
  return apiFetch<{ id: string; is_active: boolean }>(`/admin/categories/${id}/toggle-active`, {
    method: "PATCH",
  }).then((r) => r.data);
}

// --- Users -------------------------------------------------------------------

/** Safe user row (password_hash is stripped server-side). */
export type AdminUser = {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_guest: boolean;
  last_login_at: string | null;
  created_at: string;
};

export function getAdminUsers({
  q,
  page = 1,
  limit = 50,
}: { q?: string; page?: number; limit?: number } = {}): Promise<{
  users: AdminUser[];
  pagination?: Pagination;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) params.set("q", q);
  return apiFetch<AdminUser[]>(`/admin/users?${params}`).then((r) => ({
    users: r.data,
    pagination: r.pagination,
  }));
}

export function toggleAdminUser(id: string): Promise<{ id: string; is_active: boolean }> {
  return apiFetch<{ id: string; is_active: boolean }>(`/admin/users/${id}/toggle-active`, {
    method: "PATCH",
  }).then((r) => r.data);
}

// --- Merchants ---------------------------------------------------------------

export type AdminMerchant = {
  id: string;
  user_id: string;
  status: string;
  commercial_name: string;
  commercial_registration_no: string | null;
  vat_number: string | null;
  /** Masked server-side — only the last 4 characters are ever sent. */
  iban: string | null;
  commission_rate: number | null;
  rating_avg: number | null;
  rating_count: number;
  approved_at: string | null;
  created_at: string;
};

export function getAdminMerchants({
  status,
  page = 1,
  limit = 50,
}: { status?: string; page?: number; limit?: number } = {}): Promise<{
  merchants: AdminMerchant[];
  pagination?: Pagination;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return apiFetch<AdminMerchant[]>(`/admin/merchants?${params}`).then((r) => ({
    merchants: r.data,
    pagination: r.pagination,
  }));
}

// --- Merchant applications ---------------------------------------------------

export type AdminApplication = {
  id: string;
  user_id: string;
  status: "pending" | "under_review" | "approved" | "rejected";
  commercial_name: string;
  commercial_registration_no: string | null;
  vat_number: string | null;
  iban: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  user: { id: string; full_name: string; phone: string; email: string; is_active: boolean } | null;
  merchant_id: string | null;
};

export function getAdminApplications({
  status,
  page = 1,
  limit = 50,
}: { status?: string; page?: number; limit?: number } = {}): Promise<{
  applications: AdminApplication[];
  pagination?: Pagination;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return apiFetch<AdminApplication[]>(`/admin/merchant-applications?${params}`).then((r) => ({
    applications: r.data,
    pagination: r.pagination,
  }));
}

export function approveApplication(id: string): Promise<AdminApplication> {
  return apiFetch<AdminApplication>(`/admin/merchant-applications/${id}/approve`, {
    method: "POST",
  }).then((r) => r.data);
}

export function rejectApplication(id: string, reason?: string): Promise<AdminApplication> {
  return apiFetch<AdminApplication>(`/admin/merchant-applications/${id}/reject`, {
    method: "POST",
    body: { reason },
  }).then((r) => r.data);
}

// --- Admin employees ---------------------------------------------------------

export type AdminEmployee = {
  id: string;
  user_id: string;

  role: "admin" | "admin_manager" | "admin_staff" | "warehouse_staff";
  is_active: boolean;
  User?: { id: string; full_name: string; phone: string; email: string; is_active: boolean } | null;
  user?: { id: string; full_name: string; phone: string; email: string } | null;
};

export function getAdminEmployees(): Promise<AdminEmployee[]> {
  return apiFetch<AdminEmployee[]>("/admin-employees?limit=100").then((r) => r.data);
}

/**
 * Add an admin employee by phone in one real call. The backend provisions the
 * user (activates on first OTP login) and grants the `admin_employee` role slug,
 * so on login they are routed to /admin-employee with read-only admin access.
 */
export function addAdminEmployee(input: {
  phone: string;
  full_name?: string;
  email?: string;
  employeeType: "admin" | "warehouse";
  permissions?: string[];
}): Promise<AdminEmployee> {
  return apiFetch<AdminEmployee>("/admin-employees", {
    method: "POST",
    body: input,
  }).then((r) => r.data);
}

export function updateAdminEmployee(
  id: string,
  input: Partial<{
    is_active: boolean;
  }>,
): Promise<AdminEmployee> {
  return apiFetch<AdminEmployee>(`/admin-employees/${id}`, { method: "PUT", body: input }).then(
    (r) => r.data,
  );
}

export function deleteAdminEmployee(id: string): Promise<void> {
  return apiFetch<unknown>(`/admin-employees/${id}`, { method: "DELETE" }).then(() => undefined);
}

import type { AdminPermission } from "@/lib/admin-role";

export type MyPermissionsResponse = {
  role: "admin_employee";
  permissions: AdminPermission[];
};
export function getMyPermissions(): Promise<MyPermissionsResponse> {
  return apiFetch<MyPermissionsResponse>("/admin-employees/my-permissions").then((r) => r.data);
}

// --- Formatting helpers ------------------------------------------------------

export function formatSAR(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n % 1 === 0 ? n : n.toFixed(2)} ر.س`;
}
