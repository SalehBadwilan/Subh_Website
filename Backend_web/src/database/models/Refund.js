/** Refund — a refund issued against a payment/order. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Refund',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      payment_id: { type: DataTypes.UUID, allowNull: false },
      order_id: { type: DataTypes.UUID, allowNull: false },
      amount_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      reason_ar: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      provider_reference: { type: DataTypes.STRING(150), allowNull: true, unique: true },
    },
    { tableName: 'refunds' },
  );
