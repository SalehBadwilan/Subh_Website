/**
 * ProductUpdateRequest — a merchant's request to change a catalog item it sells.
 *
 * Subh owns the catalog; merchants cannot edit products directly. Instead they
 * submit a request describing the proposed change (JSONB blob of field edits),
 * which Subh reviews. This enforces the rule:
 *   "لا تسمح بتعديل بيانات المنتج مباشرة من التاجر إذا كان المطلوب Update Request."
 *
 * One of (product_id | package_id | merchant_product_id) identifies the target;
 * requested_change holds the proposed patch verbatim for the reviewer.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'ProductUpdateRequest',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      merchant_product_id: { type: DataTypes.UUID, allowNull: true },
      product_id: { type: DataTypes.UUID, allowNull: true },
      package_id: { type: DataTypes.UUID, allowNull: true },
      // Proposed field edits, e.g. { price_sar: 49, description_ar: "..." }.
      requested_change: { type: DataTypes.JSONB, allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected', 'applied'),
        allowNull: false,
        defaultValue: 'pending',
      },
      reason_ar: { type: DataTypes.TEXT, allowNull: true },
      requested_by: { type: DataTypes.UUID, allowNull: false },
      reviewed_by: { type: DataTypes.UUID, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'product_update_requests',
      paranoid: true,
    },
  );
