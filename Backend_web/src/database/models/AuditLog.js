/**
 * AuditLog — immutable record of sensitive operations (financial, stock,
 * permissions). Satisfies: "العمليات المالية والمخزون والتغييرات الحساسة يجب
 * أن تسجل في AuditLogs."
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      actor_id: { type: DataTypes.UUID, allowNull: true },
      actor_type: { type: DataTypes.STRING(30), allowNull: true },
      action: { type: DataTypes.STRING(80), allowNull: false }, // e.g. payment.capture
      entity_type: { type: DataTypes.STRING(50), allowNull: false },
      entity_id: { type: DataTypes.UUID, allowNull: true },
      before: { type: DataTypes.JSONB, allowNull: true },
      after: { type: DataTypes.JSONB, allowNull: true },
      ip_address: { type: DataTypes.INET, allowNull: true },
      user_agent: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'audit_logs',
      updatedAt: false, // audit logs are append-only
    },
  );
