/** Cart — one active cart per user (guest carts keyed by session elsewhere). */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Cart',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: true, unique: true },
      // For guest carts (MVP: guest checkout permitted — see open questions).
      session_id: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
      status: {
        type: DataTypes.ENUM('active', 'converted', 'abandoned'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    { tableName: 'carts' },
  );
