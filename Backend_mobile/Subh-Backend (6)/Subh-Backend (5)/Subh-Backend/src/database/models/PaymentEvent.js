/** PaymentEvent — raw gateway events (webhook payloads). Idempotent by event_id. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'PaymentEvent',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      payment_id: { type: DataTypes.UUID, allowNull: false },
      event_id: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      event_type: { type: DataTypes.STRING(100), allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false },
      payload: { type: DataTypes.JSONB, allowNull: false },
      received_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'payment_events' },
  );
