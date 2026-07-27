/** UserRole — many-to-many between users and roles (a user can be customer AND merchant). */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'UserRole',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      role_id: { type: DataTypes.UUID, allowNull: false },
      // For merchant-scoped roles, pin the assignment to a specific merchant.
      merchant_id: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'user_roles',
      indexes: [{ unique: true, fields: ['user_id', 'role_id', 'merchant_id'] }],
    },
  );
