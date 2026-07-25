/**
 * Shared serializers for the merchant & merchant-employee APIs.
 *
 * Every serializer omits sensitive fields (password hashes, internal flags)
 * and keeps numbers as plain JS numbers (Sequelize DECIMAL → string is
 * normalized back to Number for JSON).
 */

const num = (v) => (v == null ? null : Number(v));

export const serializeMerchant = (m) => ({
  id: m.id,
  status: m.status,
  commercial_name: m.commercial_name,
  commercial_registration_no: m.commercial_registration_no,
  vat_number: m.vat_number,
  iban: m.iban ? `****${String(m.iban).slice(-4)}` : null, // mask IBAN
  commission_rate: num(m.commission_rate),
  rating_avg: num(m.rating_avg),
  rating_count: m.rating_count,
  approved_at: m.approved_at,
  created_at: m.created_at,
});

export const serializeOrder = (o) => ({
  id: o.id,
  number: o.number,
  status: o.status,
  currency: o.currency,
  subtotal_sar: num(o.subtotal_sar),
  discount_sar: num(o.discount_sar),
  shipping_sar: num(o.shipping_sar),
  vat_sar: num(o.vat_sar),
  total_sar: num(o.total_sar),
  notes_ar: o.notes_ar,
  placed_at: o.placed_at,
  paid_at: o.paid_at,
  cancelled_at: o.cancelled_at,
  customer: o.User
    ? {
        id: o.User.id,
        full_name: o.User.full_name,
        phone: o.User.phone,
      }
    : null,
  items: (o.OrderItems || []).map((i) => ({
    id: i.id,
    product_id: i.product_id,
    package_id: i.package_id,
    name_snapshot_ar: i.name_snapshot_ar,
    sku_snapshot: i.sku_snapshot,
    quantity: i.quantity,
    unit_price_sar: num(i.unit_price_sar),
    vat_rate: num(i.vat_rate),
    line_total_sar: num(i.line_total_sar),
  })),
});

export const serializeProduct = (p, extras = {}) => {
  // Resolve the primary image + full gallery. The caller may pass an already
  // eager-loaded ProductImages array (Sequelize nested), else fall back to null
  // so products without images never break consumers.
  const gallery = Array.isArray(p.ProductImages) ? p.ProductImages : [];
  const primary = gallery.find((i) => i.is_primary) || gallery[0] || null;
  return {
    id: p.id,
    merchant_product_id: extras.merchantProductId || null,
    is_active: extras.isActive ?? true,
    sku: p.sku,
    slug: p.slug,
    name_ar: p.name_ar,
    description_ar: p.description_ar,
    price_sar: num(p.price_sar),
    vat_rate: num(p.vat_rate),
    status: p.status,
    category_id: p.category_id,
    weight_grams: p.weight_grams,
    is_package: p.is_package,
    // Unified image fields across all product responses:
    //   image_url  — the primary/cover image URL (null when none)
    //   images     — full gallery (primary first)
    image_url: primary ? primary.url : null,
    images: gallery.map((i) => ({
      id: i.id,
      image_url: i.url,
      alt_text_ar: i.alt_text_ar,
      is_primary: i.is_primary,
    })),
    inventory: extras.inventory || null,
  };
};

export const serializeInventory = (inv, product, merchantProduct) => ({
  id: inv.id,
  sku: inv.sku,
  sellable_type: inv.sellable_type,
  sellable_id: inv.sellable_id,
  on_hand: inv.on_hand,
  reserved: inv.reserved,
  available: Math.max(0, (inv.on_hand || 0) - (inv.reserved || 0)),
  reorder_threshold: inv.reorder_threshold,
  product: product
    ? {
        id: product.id,
        name_ar: product.name_ar,
        sku: product.sku,
        status: product.status,
      }
    : null,
  merchant_product: merchantProduct
    ? { id: merchantProduct.id, is_active: merchantProduct.is_active }
    : null,
});

export const serializeEmployee = (e, user) => ({
  id: e.id,
  merchant_id: e.merchant_id,
  user_id: e.user_id,
  role: e.role,
  is_active: e.is_active,
  permissions: e.permissions,
  created_at: e.created_at,
  user: user
    ? {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        is_active: user.is_active,
      }
    : null,
});

export const serializeSettlement = (s) => ({
  id: s.id,
  period_from: s.period_from,
  period_to: s.period_to,
  gross_sales_sar: num(s.gross_sales_sar),
  commission_sar: num(s.commission_sar),
  refunds_sar: num(s.refunds_sar),
  net_payable_sar: num(s.net_payable_sar),
  currency: s.currency,
  status: s.status,
  paid_at: s.paid_at,
  reference: s.reference,
  created_at: s.created_at,
});

export const serializeSubscription = (sub, plan) => ({
  id: sub?.id || null,
  status: sub?.status || null,
  started_at: sub?.started_at || null,
  current_period_end: sub?.current_period_end || null,
  plan: plan
    ? {
        id: plan.id,
        slug: plan.slug,
        name_ar: plan.name_ar,
        billing_period: plan.billing_period,
        price_sar: num(plan.price_sar),
        is_active: plan.is_active,
        features: plan.features,
      }
    : null,
});

export const serializeUpdateRequest = (r) => ({
  id: r.id,
  merchant_id: r.merchant_id,
  merchant_product_id: r.merchant_product_id,
  product_id: r.product_id,
  package_id: r.package_id,
  requested_change: r.requested_change,
  status: r.status,
  reason_ar: r.reason_ar,
  requested_by: r.requested_by,
  reviewed_by: r.reviewed_by,
  reviewed_at: r.reviewed_at,
  rejection_reason: r.rejection_reason,
  created_at: r.created_at,
});

export const serializePlanChangeRequest = (r) => ({
  id: r.id,
  merchant_id: r.merchant_id,
  current_plan_id: r.current_plan_id,
  requested_plan_id: r.requested_plan_id,
  change_type: r.change_type,
  reason_ar: r.reason_ar,
  status: r.status,
  requested_by: r.requested_by,
  reviewed_by: r.reviewed_by,
  reviewed_at: r.reviewed_at,
  rejection_reason: r.rejection_reason,
  created_at: r.created_at,
});

export default {
  serializeMerchant,
  serializeOrder,
  serializeProduct,
  serializeInventory,
  serializeEmployee,
  serializeSettlement,
  serializeSubscription,
  serializeUpdateRequest,
  serializePlanChangeRequest,
};
