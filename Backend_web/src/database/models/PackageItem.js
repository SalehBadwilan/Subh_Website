/** PackageItem — join between Package and Product with quantity. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'PackageItem',
    {
      package_id: { type: DataTypes.UUID, primaryKey: true },
      product_id: { type: DataTypes.UUID, primaryKey: true },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
    },
    { tableName: 'package_items' },
  );
