/** MerchantSubscription — a merchant's active subscription to a plan. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'MerchantSubscription',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      plan_id: { type: DataTypes.UUID, allowNull: false },
      status: {
        type: DataTypes.ENUM('active', 'past_due', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      started_at: { type: DataTypes.DATE, allowNull: false },
      current_period_end: { type: DataTypes.DATE, allowNull: false },
      // Used for recurring webhook idempotency (avoid double-charge).
      external_reference: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    },
    { tableName: 'merchant_subscriptions' },
  );
