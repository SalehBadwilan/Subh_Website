/**
 * StockMovement — immutable ledger of every stock change (restock, reserve,
 * release, consume, adjust). Required for audit + reconciliation.
 *
 * The table is APPEND-ONLY: it has only created_at (no updated_at). We override
 * the global timestamps config (updatedAt: 'updated_at') so Sequelize does not
 * try to write a non-existent column on insert.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'StockMovement',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      inventory_id: { type: DataTypes.UUID, allowNull: false },
      type: {
        type: DataTypes.ENUM('restock', 'reserve', 'release', 'consume', 'adjustment', 'return'),
        allowNull: false,
      },
      delta: { type: DataTypes.INTEGER, allowNull: false }, // signed: +restock/-consume
      reason: { type: DataTypes.STRING(255), allowNull: true },
      reference_type: { type: DataTypes.STRING(50), allowNull: true }, // order, cart, audit
      reference_id: { type: DataTypes.UUID, allowNull: true },
      actor_id: { type: DataTypes.UUID, allowNull: true }, // user who performed it
    },
    {
      tableName: 'stock_movements',
      updatedAt: false, // append-only ledger — no updated_at column exists
    },
  );
