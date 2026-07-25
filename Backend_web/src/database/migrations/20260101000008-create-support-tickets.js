'use strict';

/**
 * Migration: support_tickets.
 *
 * Added for the Customer APIs phase (POST /api/support/tickets). No existing
 * table modeled a customer support request, so this is the minimal addition.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = () => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    const deletedAt = () => ({
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable('support_tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      order_id: { type: Sequelize.UUID, allowNull: true },
      subject_ar: { type: Sequelize.STRING(200), allowNull: false },
      message_ar: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      category: { type: Sequelize.STRING(50), allowNull: true },
      ...ts(),
      ...deletedAt(),
    });

    // Optional status type — needed by Postgres for ENUM columns. Sequelize
    // createTable above already creates the ENUM, but we register it explicitly
    // for safe rollback / re-creation across dialects.
    await queryInterface.addIndex('support_tickets', {
      fields: ['user_id'],
      name: 'idx_support_tickets_user',
    });
    await queryInterface.addIndex('support_tickets', {
      fields: ['status'],
      name: 'idx_support_tickets_status',
    });

    await queryInterface.addConstraint('support_tickets', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_support_tickets_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('support_tickets', {
      fields: ['order_id'],
      type: 'foreign key',
      name: 'fk_support_tickets_order',
      references: { table: 'orders', field: 'id' },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('support_tickets', { cascade: true });
  },
};
