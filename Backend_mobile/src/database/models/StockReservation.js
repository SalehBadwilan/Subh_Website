/**
 * StockReservation — temporarily holds units while a cart/checkout completes.
 *
 * Prevents overselling the last unit under concurrent checkout. Each
 * reservation has an expires_at; a sweeper releases expired ones.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'StockReservation',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      inventory_id: { type: DataTypes.UUID, allowNull: false },
      cart_id: { type: DataTypes.UUID, allowNull: true },
      order_id: { type: DataTypes.UUID, allowNull: true },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      status: {
        type: DataTypes.ENUM('active', 'consumed', 'released'),
        allowNull: false,
        defaultValue: 'active',
      },
      expires_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'stock_reservations' },
  );
