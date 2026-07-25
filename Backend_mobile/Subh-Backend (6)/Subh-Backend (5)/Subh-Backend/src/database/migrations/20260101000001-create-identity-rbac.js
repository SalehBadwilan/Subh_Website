'use strict';

/** Migration: identity + RBAC (users, roles, permissions, joins, addresses). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const isPg = queryInterface.sequelize.options.dialect === 'postgres';
    if (isPg) {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "citext";');
    }

    // --- users --------------------------------------------------------------
    await queryInterface.createTable(
      'users',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: isPg ? Sequelize.CITEXT : Sequelize.STRING(255),
          allowNull: false,
          unique: 'uq_users_email',
        },
        phone: { type: Sequelize.STRING(20), allowNull: false, unique: 'uq_users_phone' },
        password_hash: { type: Sequelize.STRING, allowNull: false },
        full_name: { type: Sequelize.STRING(150), allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        is_guest: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        email_verified_at: { type: Sequelize.DATE, allowNull: true },
        last_login_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      },
      { paranoid: true },
    );

    // --- roles --------------------------------------------------------------
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      slug: { type: Sequelize.STRING(50), allowNull: false, unique: 'uq_roles_slug' },
      name_ar: { type: Sequelize.STRING(100), allowNull: false },
      description_ar: { type: Sequelize.STRING(255), allowNull: true },
      scope: {
        type: Sequelize.ENUM('global', 'merchant'),
        allowNull: false,
        defaultValue: 'global',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- permissions --------------------------------------------------------
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: 'uq_permissions_slug' },
      name_ar: { type: Sequelize.STRING(100), allowNull: false },
      description_ar: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- user_roles ---------------------------------------------------------
    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      role_id: { type: Sequelize.UUID, allowNull: false },
      merchant_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    // Composite uniqueness: one assignment per (user, role, merchant scope).
    await queryInterface.addIndex('user_roles', {
      name: 'uq_user_roles_assignment',
      unique: true,
      fields: ['user_id', 'role_id', 'merchant_id'],
    });

    // --- role_permissions ---------------------------------------------------
    await queryInterface.createTable('role_permissions', {
      role_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      permission_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- addresses ----------------------------------------------------------
    await queryInterface.createTable('addresses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      recipient_name: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      line1: { type: Sequelize.STRING(255), allowNull: false },
      line2: { type: Sequelize.STRING(255), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: false },
      region: { type: Sequelize.STRING(100), allowNull: false },
      postal_code: { type: Sequelize.STRING(20), allowNull: true },
      lat: { type: Sequelize.DECIMAL(9, 6), allowNull: true },
      lng: { type: Sequelize.DECIMAL(9, 6), allowNull: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- Foreign keys -------------------------------------------------------
    await queryInterface.addConstraint('user_roles', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_user_roles_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'fk_user_roles_role',
      references: { table: 'roles', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('role_permissions', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'fk_role_permissions_role',
      references: { table: 'roles', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('role_permissions', {
      fields: ['permission_id'],
      type: 'foreign key',
      name: 'fk_role_permissions_permission',
      references: { table: 'permissions', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('addresses', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_addresses_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    const order = ['addresses', 'role_permissions', 'permissions', 'user_roles', 'roles', 'users'];
    for (const t of order) {
      await queryInterface.dropTable(t, { cascade: true });
    }
  },
};
