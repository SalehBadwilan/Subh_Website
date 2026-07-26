/**
 * SubscriptionChangeRequest — a merchant's request to change its active plan.
 *
 * Subh reviews + applies plan changes (no self-service payment wiring yet).
 * The current snapshot of the active plan is captured at request time so the
 * reviewer sees the from→to transition even if the plan later changes.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'SubscriptionChangeRequest',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      current_plan_id: { type: DataTypes.UUID, allowNull: true },
      requested_plan_id: { type: DataTypes.UUID, allowNull: false },
      change_type: {
        type: DataTypes.ENUM('upgrade', 'downgrade', 'change_period'),
        allowNull: false,
        defaultValue: 'change_period',
      },
      reason_ar: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'applied'),
        allowNull: false,
        defaultValue: 'pending',
      },
      requested_by: { type: DataTypes.UUID, allowNull: false },
      reviewed_by: { type: DataTypes.UUID, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'subscription_change_requests',
      paranoid: true,
    },
  );
