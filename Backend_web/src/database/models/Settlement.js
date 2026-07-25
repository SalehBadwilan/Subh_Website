/**
 * Settlement — a payout row owed to a merchant for a period.
 *
 *   net_payable_sar = gross_sales_sar - commission_sar - refunds_sar
 *
 * In MVP these rows are produced by Subh finance (no auto-generation yet); the
 * merchant reads them through the settlements endpoint to track payouts.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Settlement',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      period_from: { type: DataTypes.DATE, allowNull: true },
      period_to: { type: DataTypes.DATE, allowNull: true },
      gross_sales_sar: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      commission_sar: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      refunds_sar: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      net_payable_sar: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      reference: { type: DataTypes.STRING(150), allowNull: true },
    },
    { tableName: 'settlements' },
  );
