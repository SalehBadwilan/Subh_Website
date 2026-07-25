/** CartItem — one line in a cart: a product or package sold by a merchant. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'CartItem',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      cart_id: { type: DataTypes.UUID, allowNull: false },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      product_id: { type: DataTypes.UUID, allowNull: true },
      package_id: { type: DataTypes.UUID, allowNull: true },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      // Price snapshot at the time of adding (guard against price drift).
      unit_price_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    },
    { tableName: 'cart_items' },
  );
