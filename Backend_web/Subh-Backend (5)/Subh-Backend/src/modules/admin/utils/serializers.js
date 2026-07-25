/**
 * Shared serializers for the Admin APIs (Stage 3).
 *
 * Every serializer omits sensitive fields (password hashes, raw IBAN, internal
 * flags) and normalizes DECIMAL columns to plain JS numbers for stable JSON.
 *
 * These never leak data that isn't already accessible through the admin scope —
 * the goal is to keep responses uniform and free of internal noise (e.g. the
 * `password_hash` column on users, full IBAN on merchants).
 */
const num = (v) => (v == null ? null : Number(v));

/**
 * Mask an IBAN — keep only the last 4 chars; surfaced for support/finance but
 * never in full. Matches the merchant portal serializer.
 */
const maskIban = (iban) => (iban ? `****${String(iban).slice(-4)}` : null);

export const serializeMerchant = (m) => ({
  id: m.id,
  user_id: m.user_id,
  status: m.status,
  commercial_name: m.commercial_name,
  commercial_registration_no: m.commercial_registration_no,
  vat_number: m.vat_number,
  iban: maskIban(m.iban),
  commission_rate: num(m.commission_rate),
  rating_avg: num(m.rating_avg),
  rating_count: m.rating_count,
  approved_at: m.approved_at,
  created_at: m.created_at,
  updated_at: m.updated_at,
});

export const serializeApplication = (a, opts = {}) => ({
  id: a.id,
  user_id: a.user_id,
  status: a.status,
  commercial_name: a.commercial_name,
  commercial_registration_no: a.commercial_registration_no,
  vat_number: a.vat_number,
  iban: maskIban(a.iban),
  notes: a.notes,
  reviewed_by: a.reviewed_by,
  reviewed_at: a.reviewed_at,
  rejection_reason: a.rejection_reason,
  created_at: a.created_at,
  updated_at: a.updated_at,
  // Eager-loaded user (optional) — only safe fields exposed.
  user: a.User
    ? {
        id: a.User.id,
        full_name: a.User.full_name,
        phone: a.User.phone,
        email: a.User.email,
        is_active: a.User.is_active,
      }
    : null,
  merchant_id: opts.merchantId || null,
});

export const serializeUser = (u) => {
  if (!u) return null;
  const r = u.toJSON ? u.toJSON() : u;
  // password_hash is excluded at query level too — belt and braces.
  delete r.password_hash;
  return r;
};

export const serializeProduct = (p) => ({
  id: p.id,
  category_id: p.category_id,
  sku: p.sku,
  slug: p.slug,
  name_ar: p.name_ar,
  description_ar: p.description_ar,
  price_sar: num(p.price_sar),
  vat_rate: num(p.vat_rate),
  status: p.status,
  weight_grams: p.weight_grams,
  is_package: p.is_package,
  created_at: p.created_at,
  updated_at: p.updated_at,
  category: p.Category ? { id: p.Category.id, slug: p.Category.slug, name_ar: p.Category.name_ar } : null,
  merchants_count: p.MerchantProducts ? p.MerchantProducts.length : 0,
});

export const serializeCategory = (c) => ({
  id: c.id,
  parent_id: c.parent_id,
  slug: c.slug,
  name_ar: c.name_ar,
  is_active: c.is_active,
  sort_order: c.sort_order,
  created_at: c.created_at,
  updated_at: c.updated_at,
});

export const serializePackage = (p) => ({
  id: p.id,
  sku: p.sku,
  slug: p.slug,
  name_ar: p.name_ar,
  description_ar: p.description_ar,
  price_sar: num(p.price_sar),
  vat_rate: num(p.vat_rate),
  status: p.status,
  created_at: p.created_at,
  updated_at: p.updated_at,
});

export const serializeSetting = (s) => ({
  id: s.id,
  key: s.key,
  label_ar: s.label_ar,
  value: s.value,
  group: s.group,
  updated_at: s.updated_at,
});

export default {
  serializeMerchant,
  serializeApplication,
  serializeUser,
  serializeProduct,
  serializeCategory,
  serializePackage,
  serializeSetting,
};
