/**
 * Order — a customer's purchase.
 *
 * MVP design decision (logged as open question): an order in v1 belongs to a
 * SINGLE merchant to keep fulfilment + payout simple. Multi-merchant carts are
 * split into multiple orders at checkout (parent order_id groups a split). This
 * matches "لا تنفذ تقسيم المدفوعات بين التجار في النسخة الأولى."
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Order',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      // Human-friendly sequential number for invoices/customer service.
      number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      merchant_id: { type: DataTypes.UUID, allowNull: false },
      parent_order_id: { type: DataTypes.UUID, allowNull: true },
      shipping_address_id: { type: DataTypes.UUID, allowNull: false },
      status: {
        type: DataTypes.ENUM(
          'pending_payment',
          'paid',
          'preparing',
          'ready_to_ship',
          'shipped',
          'delivered',
          'cancelled',
          'returned',
        ),
        allowNull: false,
        defaultValue: 'pending_payment',
      },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
      subtotal_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      discount_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      shipping_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      vat_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      total_sar: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      notes_ar: { type: DataTypes.TEXT, allowNull: true },
      placed_at: { type: DataTypes.DATE, allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'orders' },
  );
