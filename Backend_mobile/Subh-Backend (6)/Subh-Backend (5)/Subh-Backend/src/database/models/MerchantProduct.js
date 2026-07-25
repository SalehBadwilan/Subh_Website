/**
 * MerchantProduct — which products/packages a merchant is ALLOWED to sell.
 * Enforces: "التاجر يبيع فقط المنتجات والبكجات المسموح له بها."
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'MerchantProduct',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      // Exactly one of product_id / package_id is set (enforced by DB check).
      product_id: { type: DataTypes.UUID, allowNull: true },
      package_id: { type: DataTypes.UUID, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'merchant_products',
      // Uniqueness for non-null product/package is enforced in the migration
      // via partial unique indexes (PostgreSQL) — kept out of the model to
      // stay portable across dialects used during verification.
      indexes: [{ fields: ['merchant_id'] }, { fields: ['product_id'] }, { fields: ['package_id'] }],
    },
  );
