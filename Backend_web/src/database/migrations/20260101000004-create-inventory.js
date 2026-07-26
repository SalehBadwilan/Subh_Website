'use strict';

/** Migration: inventory, stock_reservations, stock_movements. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = () => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- inventory ----------------------------------------------------------
    await queryInterface.createTable('inventory', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      sellable_type: { type: Sequelize.ENUM('product', 'package'), allowNull: false },
      sellable_id: { type: Sequelize.UUID, allowNull: false },
      sku: { type: Sequelize.STRING(50), allowNull: false },
      on_hand: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reserved: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_threshold: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      ...ts(),
    });
    await queryInterface.addIndex('inventory', {
      name: 'uq_inventory_sellable',
      unique: true,
      fields: ['sellable_type', 'sellable_id'],
    });
    await queryInterface.addIndex('inventory', { fields: ['sku'], name: 'idx_inventory_sku' });
    // Non-negative stock + reserved cannot exceed on_hand.
    await queryInterface.sequelize.query(
      'ALTER TABLE inventory ADD CONSTRAINT chk_inventory_on_hand CHECK (on_hand >= 0);' +
        'ALTER TABLE inventory ADD CONSTRAINT chk_inventory_reserved CHECK (reserved >= 0 AND reserved <= on_hand);',
    );

    // --- stock_reservations -------------------------------------------------
    await queryInterface.createTable('stock_reservations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      inventory_id: { type: Sequelize.UUID, allowNull: false },
      cart_id: { type: Sequelize.UUID, allowNull: true },
      order_id: { type: Sequelize.UUID, allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('active', 'consumed', 'released'),
        allowNull: false,
        defaultValue: 'active',
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      ...ts(),
    });
    await queryInterface.addIndex('stock_reservations', {
      fields: ['inventory_id'],
      name: 'idx_reservations_inventory',
    });
    await queryInterface.addIndex('stock_reservations', {
      fields: ['expires_at'],
      name: 'idx_reservations_expires',
    });

    // --- stock_movements ----------------------------------------------------
    await queryInterface.createTable('stock_movements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      inventory_id: { type: Sequelize.UUID, allowNull: false },
      type: {
        type: Sequelize.ENUM('restock', 'reserve', 'release', 'consume', 'adjustment', 'return'),
        allowNull: false,
      },
      delta: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: true },
      reference_type: { type: Sequelize.STRING(50), allowNull: true },
      reference_id: { type: Sequelize.UUID, allowNull: true },
      actor_id: { type: Sequelize.UUID, allowNull: true },
      // Immutable ledger — created only.
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addIndex('stock_movements', {
      fields: ['inventory_id'],
      name: 'idx_movements_inventory',
    });

    // --- Foreign keys -------------------------------------------------------
    await queryInterface.addConstraint('stock_reservations', {
      fields: ['inventory_id'],
      type: 'foreign key',
      name: 'fk_reservations_inventory',
      references: { table: 'inventory', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('stock_movements', {
      fields: ['inventory_id'],
      type: 'foreign key',
      name: 'fk_movements_inventory',
      references: { table: 'inventory', field: 'id' },
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface) {
    for (const t of ['stock_movements', 'stock_reservations', 'inventory']) {
      await queryInterface.dropTable(t, { cascade: true });
    }
  },
};
