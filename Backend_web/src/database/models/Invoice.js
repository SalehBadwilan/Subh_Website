/** Invoice — tax invoice (ZATCA-style fields reserved) for an order. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Invoice',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      order_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      issued_at: { type: DataTypes.DATE, allowNull: false },
      buyer_name: { type: DataTypes.STRING(150), allowNull: false },
      buyer_vat_number: { type: DataTypes.STRING(50), allowNull: true },
      subtotal_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      vat_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      total_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      pdf_url: { type: DataTypes.STRING(1024), allowNull: true },
    },
    { tableName: 'invoices' },
  );
