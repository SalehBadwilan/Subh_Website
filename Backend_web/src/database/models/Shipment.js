/** Shipment — fulfilment tracking for an order. Subh-managed in v1. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Shipment',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      order_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      carrier: { type: DataTypes.STRING(100), allowNull: true },
      tracking_number: { type: DataTypes.STRING(100), allowNull: true },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'packed',
          'handed_to_carrier',
          'in_transit',
          'out_for_delivery',
          'delivered',
          'failed_delivery',
          'returned',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      shipped_at: { type: DataTypes.DATE, allowNull: true },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'shipments' },
  );
