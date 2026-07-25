/** MerchantEmployee — a user invited by a merchant with scoped permissions. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'MerchantEmployee',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      user_id: { type: DataTypes.UUID, allowNull: false },
      role: {
        // merchant_owner | merchant_manager | merchant_staff
        type: DataTypes.ENUM('merchant_owner', 'merchant_manager', 'merchant_staff'),
        allowNull: false,
      },
      // Optional granular permission bitmask/string stored as JSON for MVP.
      permissions: { type: DataTypes.JSONB, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'merchant_employees',
      indexes: [{ unique: true, fields: ['merchant_id', 'user_id'] }],
      paranoid: true,
    },
  );
