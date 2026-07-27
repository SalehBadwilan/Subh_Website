/**
 * OrderStatusHistory — append-only timeline of an order's lifecycle.
 *
 * The table has only created_at (no updated_at). We override the global
 * timestamps config so Sequelize does not try to write updated_at on insert.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'OrderStatusHistory',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      order_id: { type: DataTypes.UUID, allowNull: false },
      from_status: { type: DataTypes.STRING(30), allowNull: true },
      to_status: { type: DataTypes.STRING(30), allowNull: false },
      comment_ar: { type: DataTypes.TEXT, allowNull: true },
      actor_id: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'order_status_history',
      updatedAt: false, // append-only — no updated_at column exists
    },
  );
