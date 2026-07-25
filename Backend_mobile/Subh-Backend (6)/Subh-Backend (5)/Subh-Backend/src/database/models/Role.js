/** Role — e.g. customer, merchant, merchant_employee, warehouse, admin, admin_employee. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Role',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      slug: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true },
      },
      name_ar: { type: DataTypes.STRING(100), allowNull: false },
      description_ar: { type: DataTypes.STRING(255), allowNull: true },
      scope: {
        type: DataTypes.ENUM('global', 'merchant'),
        allowNull: false,
        defaultValue: 'global',
      },
    },
    { tableName: 'roles' },
  );
