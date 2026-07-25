/** Plan — subscription tier offered to merchants. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      slug: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name_ar: { type: DataTypes.STRING(100), allowNull: false },
      billing_period: {
        type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
        allowNull: false,
      },
      price_sar: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      features: { type: DataTypes.JSONB, allowNull: true },
    },
    { tableName: 'plans' },
  );
