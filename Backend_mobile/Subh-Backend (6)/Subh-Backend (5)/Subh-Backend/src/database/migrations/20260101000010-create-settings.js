'use strict';

/**
 * Migration: Stage 3 — Admin settings table.
 *
 * Additive only: creates `settings` (key/value with JSONB payload). No existing
 * table is altered. Canonical DB is PostgreSQL; the JSONB + UUID types are
 * portable across PG (and degrade gracefully on SQLite for local testing).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = () => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      key: { type: Sequelize.STRING(100), allowNull: false, unique: 'uq_settings_key' },
      label_ar: { type: Sequelize.STRING(150), allowNull: true },
      value: { type: Sequelize.JSONB, allowNull: false },
      group: { type: Sequelize.STRING(50), allowNull: true },
      ...ts(),
    });

    await queryInterface.addIndex('settings', {
      fields: ['group'],
      name: 'idx_settings_group',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('settings', { cascade: true });
  },
};
