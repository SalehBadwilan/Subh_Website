/**
 * Shared serializers for the Operations APIs (Stage 4).
 *
 * Every serializer omits sensitive fields (password hashes, raw IBAN, internal
 * flags) and normalizes DECIMAL columns to plain JS numbers for stable JSON.
 *
 * These never leak data that isn't already accessible through the operations
 * scope — the goal is to keep responses uniform and free of internal noise.
 */
const num = (v) => (v == null ? null : Number(v));

/**
 * Order — fulfilment-focused view. Customer personal data is reduced to what
 * ops actually needs (name + phone for the shipment), and the shipment row is
 * attached when present.
 */
export const serializeOrder = (o) => ({
  id: o.id,
  number: o.number,
  merchant_id: o.merchant_id,
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
  created_at: o.created_at,
  merchant: o.Merchant
    ? { id: o.Merchant.id, commercial_name: o.Merchant.commercial_name }
    : null,
  customer: o.User
    ? { id: o.User.id, full_name: o.User.full_name, phone: o.User.phone }
    : null,
  items: (o.OrderItems || []).map((i) => ({
    id: i.id,
    product_id: i.product_id,
    package_id: i.package_id,
    name_snapshot_ar: i.name_snapshot_ar,
    sku_snapshot: i.sku_snapshot,
    quantity: i.quantity,
    unit_price_sar: num(i.unit_price_sar),
    line_total_sar: num(i.line_total_sar),
  })),
  shipment: o.Shipment ? serializeShipment(o.Shipment) : null,
});

/**
 * Inventory — central warehouse view (platform-wide, not scoped to a merchant).
 */
export const serializeInventory = (inv, catalog) => ({
  id: inv.id,
  sku: inv.sku,
  sellable_type: inv.sellable_type,
  sellable_id: inv.sellable_id,
  on_hand: inv.on_hand,
  reserved: inv.reserved,
  available: Math.max(0, (inv.on_hand || 0) - (inv.reserved || 0)),
  reorder_threshold: inv.reorder_threshold,
  is_low_stock:
    Math.max(0, (inv.on_hand || 0) - (inv.reserved || 0)) <= (inv.reorder_threshold || 0),
  catalog: catalog
  ? {
      id: catalog.id,
      name_ar: catalog.name_ar,
      sku: catalog.sku,
      status: catalog.status,
      price_sar: num(catalog.price_sar),
    }
  : null,
});

/**
 * StockMovement (Inventory Movement) — the immutable ledger entry. The full
 * record is safe to expose (it is an audit trail), including the actor + the
 * previous/new quantities captured by the adjust handler.
 */
export const serializeMovement = (mv, extras = {}) => ({
  id: mv.id,
  inventory_id: mv.inventory_id,
  type: mv.type,
  delta: mv.delta,
  reason: mv.reason,
  reference_type: mv.reference_type,
  reference_id: mv.reference_id,
  actor_id: mv.actor_id,
  // Quantities captured at adjustment time (provided by the adjust handler).
  before: extras.before ?? null,
  after: extras.after ?? null,
  // Denormalized for convenience when included via association.
  inventory: mv.Inventory ? serializeInventory(mv.Inventory) : null,
  actor: mv.Actor ? { id: mv.Actor.id, full_name: mv.Actor.full_name } : null,
  created_at: mv.created_at,
});

/**
 * Shipment — fulfilment tracking, joined to its order. No sensitive fields.
 */
export const serializeShipment = (s) => ({
  id: s.id,
  order_id: s.order_id,
  carrier: s.carrier,
  tracking_number: s.tracking_number,
  status: s.status,
  shipped_at: s.shipped_at,
  delivered_at: s.delivered_at,
  created_at: s.created_at,
  updated_at: s.updated_at,
  order: s.Order
    ? {
        id: s.Order.id,
        number: s.Order.number,
        status: s.Order.status,
        total_sar: num(s.Order.total_sar),
        merchant: s.Order.Merchant
          ? { id: s.Order.Merchant.id, commercial_name: s.Order.Merchant.commercial_name }
          : null,
        customer: s.Order.User
          ? { id: s.Order.User.id, full_name: s.Order.User.full_name, phone: s.Order.User.phone }
          : null,
      }
    : null,
});

export default {
  serializeOrder,
  serializeInventory,
  serializeMovement,
  serializeShipment,
};
