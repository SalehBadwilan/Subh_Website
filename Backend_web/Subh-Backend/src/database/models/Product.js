/** Product — central catalog item managed by Subh. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Product',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      category_id: { type: DataTypes.UUID, allowNull: true },
      sku: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      name_ar: { type: DataTypes.STRING(200), allowNull: false },
      description_ar: { type: DataTypes.TEXT, allowNull: true },
      // Prices managed centrally by Subh. assumed VAT-INCLUSIVE per MVP
      // decision (open question logged in delivery notes).
      price_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      vat_rate: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0.15,
        validate: { min: 0, max: 1 },
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      weight_grams: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
      is_package: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'products', paranoid: true },
  );
