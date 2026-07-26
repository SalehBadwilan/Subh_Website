/** Permission — fine-grained action, e.g. "orders:read", "inventory:adjust". */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Permission',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true },
      },
      name_ar: { type: DataTypes.STRING(100), allowNull: false },
      description_ar: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'permissions' },
  );
