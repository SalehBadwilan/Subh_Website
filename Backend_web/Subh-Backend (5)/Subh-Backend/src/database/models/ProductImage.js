/** ProductImage — media gallery. first/sort_order governs the primary image. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'ProductImage',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      product_id: { type: DataTypes.UUID, allowNull: false },
      url: { type: DataTypes.STRING(1024), allowNull: false, validate: { isUrl: true } },
      alt_text_ar: { type: DataTypes.STRING(200), allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'product_images' },
  );
