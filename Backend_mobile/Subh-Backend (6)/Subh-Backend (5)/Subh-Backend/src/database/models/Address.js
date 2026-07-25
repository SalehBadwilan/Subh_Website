/** Address — customer shipping/billing addresses. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Address',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      recipient_name: { type: DataTypes.STRING(150), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      line1: { type: DataTypes.STRING(255), allowNull: false },
      line2: { type: DataTypes.STRING(255), allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: false },
      // Saudi administrative divisions: region then district.
      region: { type: DataTypes.STRING(100), allowNull: false },
      postal_code: { type: DataTypes.STRING(20), allowNull: true },
      lat: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      lng: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'addresses' },
  );
