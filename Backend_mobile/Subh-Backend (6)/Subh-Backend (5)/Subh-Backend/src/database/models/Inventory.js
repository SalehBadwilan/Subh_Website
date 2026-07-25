/**
 * Inventory — central warehouse stock for a sellable item (product OR package).
 *
 * sellable_type discriminator + sellable_id is the polymorphic key. In the
 * first version there is a single Subh-managed warehouse, so one row per
 * sellable item.
 *
 * on_hand      = physical units present
 * reserved     = temporarily held for pending orders (atomic increment)
 * available    = on_hand - reserved  (kept consistent via CHECK)
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Inventory',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      sellable_type: {
        type: DataTypes.ENUM('product', 'package'),
        allowNull: false,
      },
      sellable_id: { type: DataTypes.UUID, allowNull: false },
      sku: { type: DataTypes.STRING(50), allowNull: false },
      on_hand: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
      reserved: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
      reorder_threshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, validate: { min: 0 } },
    },
    {
      tableName: 'inventory',
      indexes: [{ unique: true, fields: ['sellable_type', 'sellable_id'] }],
    },
  );
