'use strict';

/** Migration: carts, cart_items, orders, order_items, order_status_history. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = () => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- carts --------------------------------------------------------------
    await queryInterface.createTable('carts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: Sequelize.UUID, allowNull: true, unique: 'uq_carts_user' },
      session_id: { type: Sequelize.STRING(100), allowNull: true, unique: 'uq_carts_session' },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'SAR' },
      status: {
        type: Sequelize.ENUM('active', 'converted', 'abandoned'),
        allowNull: false,
        defaultValue: 'active',
      },
      ...ts(),
    });

    // --- cart_items ---------------------------------------------------------
    await queryInterface.createTable('cart_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      cart_id: { type: Sequelize.UUID, allowNull: false },
      merchant_id: { type: Sequelize.UUID, allowNull: false },
      product_id: { type: Sequelize.UUID, allowNull: true },
      package_id: { type: Sequelize.UUID, allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      ...ts(),
    });
    await queryInterface.sequelize.query(
      "ALTER TABLE cart_items ADD CONSTRAINT chk_cart_items_sellable " +
        'CHECK ((product_id IS NULL) <> (package_id IS NULL));',
    );

    // --- orders -------------------------------------------------------------
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      number: { type: Sequelize.STRING(20), allowNull: false, unique: 'uq_orders_number' },
      user_id: { type: Sequelize.UUID, allowNull: false },
      merchant_id: { type: Sequelize.UUID, allowNull: false },
      parent_order_id: { type: Sequelize.UUID, allowNull: true },
      shipping_address_id: { type: Sequelize.UUID, allowNull: false },
      status: {
        type: Sequelize.ENUM(
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
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'SAR' },
      subtotal_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      discount_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      shipping_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      vat_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      total_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      notes_ar: { type: Sequelize.TEXT, allowNull: true },
      placed_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      ...ts(),
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE orders ADD CONSTRAINT chk_orders_totals CHECK (total_sar >= 0);',
    );

    // --- order_items --------------------------------------------------------
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: { type: Sequelize.UUID, allowNull: false },
      merchant_id: { type: Sequelize.UUID, allowNull: false },
      product_id: { type: Sequelize.UUID, allowNull: true },
      package_id: { type: Sequelize.UUID, allowNull: true },
      name_snapshot_ar: { type: Sequelize.STRING(200), allowNull: false },
      sku_snapshot: { type: Sequelize.STRING(50), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      vat_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.15 },
      line_total_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      ...ts(),
    });
    await queryInterface.sequelize.query(
      "ALTER TABLE order_items ADD CONSTRAINT chk_order_items_sellable " +
        'CHECK ((product_id IS NULL) <> (package_id IS NULL));',
    );

    // --- order_status_history ----------------------------------------------
    await queryInterface.createTable('order_status_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: { type: Sequelize.UUID, allowNull: false },
      from_status: { type: Sequelize.STRING(30), allowNull: true },
      to_status: { type: Sequelize.STRING(30), allowNull: false },
      comment_ar: { type: Sequelize.TEXT, allowNull: true },
      actor_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- Indexes ------------------------------------------------------------
    await queryInterface.addIndex('cart_items', { fields: ['cart_id'], name: 'idx_cart_items_cart' });
    await queryInterface.addIndex('orders', { fields: ['user_id'], name: 'idx_orders_user' });
    await queryInterface.addIndex('orders', { fields: ['merchant_id'], name: 'idx_orders_merchant' });
    await queryInterface.addIndex('orders', { fields: ['status'], name: 'idx_orders_status' });
    await queryInterface.addIndex('order_items', { fields: ['order_id'], name: 'idx_order_items_order' });
    await queryInterface.addIndex('order_status_history', {
      fields: ['order_id'],
      name: 'idx_status_history_order',
    });

    // --- Foreign keys -------------------------------------------------------
    await queryInterface.addConstraint('carts', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_carts_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('cart_items', {
      fields: ['cart_id'],
      type: 'foreign key',
      name: 'fk_cart_items_cart',
      references: { table: 'carts', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('cart_items', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_cart_items_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('cart_items', {
      fields: ['product_id'],
      type: 'foreign key',
      name: 'fk_cart_items_product',
      references: { table: 'products', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('cart_items', {
      fields: ['package_id'],
      type: 'foreign key',
      name: 'fk_cart_items_package',
      references: { table: 'packages', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('orders', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_orders_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('orders', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_orders_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('orders', {
      fields: ['shipping_address_id'],
      type: 'foreign key',
      name: 'fk_orders_address',
      references: { table: 'addresses', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('orders', {
      fields: ['parent_order_id'],
      type: 'foreign key',
      name: 'fk_orders_parent',
      references: { table: 'orders', field: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addConstraint('order_items', {
      fields: ['order_id'],
      type: 'foreign key',
      name: 'fk_order_items_order',
      references: { table: 'orders', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('order_items', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_order_items_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('order_status_history', {
      fields: ['order_id'],
      type: 'foreign key',
      name: 'fk_status_history_order',
      references: { table: 'orders', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    const order = [
      'order_status_history',
      'order_items',
      'orders',
      'cart_items',
      'carts',
    ];
    for (const t of order) {
      await queryInterface.dropTable(t, { cascade: true });
    }
  },
};
