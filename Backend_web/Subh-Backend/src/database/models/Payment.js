/**
 * Payment — a payment attempt for an order.
 *
 * provider_reference is UNIQUE to satisfy: "إشعار الدفع المتكرر يجب ألا ينشئ
 * طلبًا أو خصمًا مكررًا" — the gateway webhook id is stored here and the unique
 * constraint makes a replay a no-op.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Payment',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      order_id: { type: DataTypes.UUID, allowNull: false },
      provider: { type: DataTypes.STRING(50), allowNull: false },
      provider_reference: { type: DataTypes.STRING(150), allowNull: true, unique: true },
      method: {
        type: DataTypes.ENUM('card', 'apple_pay', 'mada', 'stc_pay', 'transfer', 'wallet'),
        allowNull: false,
      },
      amount_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
      status: {
        type: DataTypes.ENUM('initiated', 'authorized', 'captured', 'failed', 'refunded', 'disputed'),
        allowNull: false,
        defaultValue: 'initiated',
      },
      captured_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'payments', paranoid: true },
  );
