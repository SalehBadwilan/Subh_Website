/** OrderItem — a single line within an order. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'OrderItem',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      order_id: { type: DataTypes.UUID, allowNull: false },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      product_id: { type: DataTypes.UUID, allowNull: true },
      package_id: { type: DataTypes.UUID, allowNull: true },
      name_snapshot_ar: { type: DataTypes.STRING(200), allowNull: false },
      sku_snapshot: { type: DataTypes.STRING(50), allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      unit_price_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      vat_rate: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 0.15 },
      line_total_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    },
    { tableName: 'order_items' },
  );
