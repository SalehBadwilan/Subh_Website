/** Category — self-nested taxonomy for catalog. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Category',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      parent_id: { type: DataTypes.UUID, allowNull: true },
      slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      name_ar: { type: DataTypes.STRING(100), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'categories' },
  );
