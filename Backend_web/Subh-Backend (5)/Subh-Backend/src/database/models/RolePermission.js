/** RolePermission — many-to-many between roles and permissions. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'RolePermission',
    {
      role_id: { type: DataTypes.UUID, primaryKey: true },
      permission_id: { type: DataTypes.UUID, primaryKey: true },
    },
    { tableName: 'role_permissions' },
  );
