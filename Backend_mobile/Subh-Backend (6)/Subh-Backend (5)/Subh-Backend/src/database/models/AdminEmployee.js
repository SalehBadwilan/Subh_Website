/** AdminEmployee — a Subh staff user with a department + access scope. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'AdminEmployee',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      department: {
        type: DataTypes.ENUM(
          'management',
          'catalog',
          'inventory',
          'fulfillment',
          'finance',
          'support',
        ),
        allowNull: false,
      },
      role: {
        // admin | admin_manager | admin_staff | warehouse_staff
        type: DataTypes.ENUM('admin', 'admin_manager', 'admin_staff', 'warehouse_staff'),
        allowNull: false,
        defaultValue: 'admin_staff',
      },
      permissions: {
  type: DataTypes.JSON,
  allowNull: false,
  defaultValue: [],
},
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'admin_employees', paranoid: true },
  );
