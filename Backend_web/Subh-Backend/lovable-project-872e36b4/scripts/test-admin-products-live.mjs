/**
 * End-to-end live test simulating exactly what the admin products page does.
 *
 * Boots no server — uses the running backend at http://localhost:3000.
 * Mirrors the frontend flow:
 *   1. POST /api/auth/otp/request   (login.tsx)
 *   2. POST /api/auth/otp/verify    (verify.tsx — gets JWT)
 *   3. GET  /api/admin/products     (admin.products.tsx useQuery)
 *   4. GET  /api/admin/categories
 *   5. GET  /api/admin/merchants?status=active
 *   6. GET  /api/merchant-products?product_id=...
 *   7. POST /api/admin/products/:id/assign  + duplicate → 409
 *   8. DELETE /api/admin/products/:id/assign/:merchantId
 *
 * This is the closest possible approximation of "the request shows in Network
 * and returns the real products" without a real browser.
 */

const BASE = process.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_PHONE = "+966560024444"; // demo admin user

let pass = 0;
let fail = 0;
const check = (label, cond, extra = "") => {
  if (cond) pass += 1; else fail += 1;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}`);
};

async function req(method, path, { token, body, query } = {}) {
  const url = new URL(BASE + path);
  if (query) for (const [k, v] of Object.entries(query)) if (v != null) url.searchParams.set(k, String(v));
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

async function main() {
  console.log(`Testing against backend: ${BASE}\n`);

  // 1. OTP request
  let r = await req("POST", "/api/auth/otp/request", { body: { phone: ADMIN_PHONE } });
  check("POST /api/auth/otp/request → 200", r.status === 200, `got ${r.status}`);
  const devOtp = r.body?.data?.devOtp;
  check("OTP returned in dev mode", !!devOtp, devOtp || "missing");

  // 2. OTP verify → JWT
  r = await req("POST", "/api/auth/otp/verify", { body: { phone: ADMIN_PHONE, otp: devOtp } });
  check("POST /api/auth/otp/verify → 200", r.status === 200, `got ${r.status}`);
  const token = r.body?.data?.token;
  check("JWT token returned", !!token, token ? "(token present)" : "missing");
  if (!token) { console.log("ABORT: no token"); process.exit(1); }

  // 3. Admin products (the main thing the page renders)
  r = await req("GET", "/api/admin/products", { token, query: { limit: 20, page: 1, sort: "created_at" } });
  check("GET /api/admin/products → 200 (admin token)", r.status === 200, `got ${r.status}`);
  check("Response is paginated envelope", !!r.body?.pagination, `total=${r.body?.pagination?.total}`);
  check("Response data is an array", Array.isArray(r.body?.data), `len=${r.body?.data?.length}`);
  check("Each product has expected field names", r.body?.data?.every(p =>
    typeof p.id === "string" && typeof p.name_ar === "string" && typeof p.price_sar === "number" && ["draft","active","archived"].includes(p.status)
  ), "id/name_ar/price_sar/status all present");

  const firstProduct = r.body?.data?.[0];
  console.log(`   first product: name="${firstProduct?.name_ar}" price=${firstProduct?.price_sar} status=${firstProduct?.status} merchants_count=${firstProduct?.merchants_count}`);

  // 4. Without token → 401
  r = await req("GET", "/api/admin/products");
  check("GET /api/admin/products without token → 401", r.status === 401, `got ${r.status}`);

  // 5. Categories
  r = await req("GET", "/api/admin/categories", { token, query: { limit: 100 } });
  check("GET /api/admin/categories → 200", r.status === 200, `got ${r.status} n=${r.body?.pagination?.total}`);

  // 6. Merchants (active only — what the assign dialog uses)
  r = await req("GET", "/api/admin/merchants", { token, query: { status: "active", limit: 100 } });
  check("GET /api/admin/merchants?status=active → 200", r.status === 200, `got ${r.status} n=${r.body?.pagination?.total}`);
  const merchants = r.body?.data ?? [];
  const firstMerchant = merchants[0];

  // 7. Assign / Unassign round trip + duplicate guard
  if (firstProduct && firstMerchant) {
    // Clean up any prior assignment (idempotent test setup)
    await req("DELETE", `/api/admin/products/${firstProduct.id}/assign/${firstMerchant.id}`, { token });

    r = await req("POST", `/api/admin/products/${firstProduct.id}/assign`, { token, body: { merchant_id: firstMerchant.id } });
    check("POST /api/admin/products/:id/assign → 201", r.status === 201, `got ${r.status}`);

    r = await req("POST", `/api/admin/products/${firstProduct.id}/assign`, { token, body: { merchant_id: firstMerchant.id } });
    check("duplicate assign → 409", r.status === 409, `got ${r.status}`);

    // The page uses this endpoint to learn which merchants are assigned
    r = await req("GET", "/api/merchant-products", { query: { product_id: firstProduct.id, limit: 100 } });
    check("GET /api/merchant-products?product_id=... → 200", r.status === 200, `got ${r.status} n=${r.body?.pagination?.total}`);
    const assignedIds = (r.body?.data ?? []).filter(a => a.product_id === firstProduct.id).map(a => a.merchant_id);
    check("assignment reflected in merchant-products", assignedIds.includes(firstMerchant.id), `${assignedIds.length} assigned`);

    r = await req("DELETE", `/api/admin/products/${firstProduct.id}/assign/${firstMerchant.id}`, { token });
    check("DELETE /api/admin/products/:id/assign/:merchantId → 200", r.status === 200, `got ${r.status}`);
  }

  // 8. Toggle active round-trip (then revert)
  if (firstProduct) {
    const beforeStatus = firstProduct.status;
    r = await req("PATCH", `/api/admin/products/${firstProduct.id}/toggle-active`, { token });
    check("PATCH /api/admin/products/:id/toggle-active → 200", r.status === 200, `got ${r.status} new=${r.body?.data?.status}`);
    // revert to keep DB clean
    if (r.body?.data?.status !== beforeStatus) {
      await req("PATCH", `/api/admin/products/${firstProduct.id}/toggle-active`, { token });
    }
  }

  // 9. Filtering — verify q/category_id/status actually filter (no mock data)
  r = await req("GET", "/api/admin/products", { token, query: { status: "archived" } });
  check("status=archived filter works", r.status === 200 && r.body?.data?.every(p => p.status === "archived"), `n=${r.body?.pagination?.total}`);

  r = await req("GET", "/api/admin/products", { token, query: { q: "zzzznotreal" } });
  check("q filter with no match → empty", r.status === 200 && r.body?.data?.length === 0, `n=${r.body?.pagination?.total}`);

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
