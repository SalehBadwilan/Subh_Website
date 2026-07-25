'use strict';

/** Migration: merchants, applications, employees, plans, subscriptions, admin staff. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = (extra = {}) => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      ...extra,
    });

    // --- plans (no deps) ----------------------------------------------------
    await queryInterface.createTable('plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      slug: { type: Sequelize.STRING(50), allowNull: false, unique: 'uq_plans_slug' },
      name_ar: { type: Sequelize.STRING(100), allowNull: false },
      billing_period: {
        type: Sequelize.ENUM('monthly', 'quarterly', 'yearly'),
        allowNull: false,
      },
      price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      features: { type: Sequelize.JSONB, allowNull: true },
      ...ts(),
    });

    // --- merchant_applications ---------------------------------------------
    await queryInterface.createTable(
      'merchant_applications',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: { type: Sequelize.UUID, allowNull: false },
        status: {
          type: Sequelize.ENUM('pending', 'under_review', 'approved', 'rejected'),
          allowNull: false,
          defaultValue: 'pending',
        },
        commercial_name: { type: Sequelize.STRING(150), allowNull: false },
        commercial_registration_no: { type: Sequelize.STRING(50), allowNull: false },
        vat_number: { type: Sequelize.STRING(50), allowNull: true },
        iban: { type: Sequelize.STRING(34), allowNull: false },
        notes: { type: Sequelize.TEXT, allowNull: true },
        reviewed_by: { type: Sequelize.UUID, allowNull: true },
        reviewed_at: { type: Sequelize.DATE, allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        ...ts({ deleted_at: { type: Sequelize.DATE, allowNull: true } }),
      },
      { paranoid: true },
    );

    // --- merchants ----------------------------------------------------------
    await queryInterface.createTable(
      'merchants',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: { type: Sequelize.UUID, allowNull: false, unique: 'uq_merchants_user' },
        status: {
          type: Sequelize.ENUM('active', 'suspended', 'terminated'),
          allowNull: false,
          defaultValue: 'active',
        },
        commercial_name: { type: Sequelize.STRING(150), allowNull: false },
        commercial_registration_no: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: 'uq_merchants_cr',
        },
        vat_number: { type: Sequelize.STRING(50), allowNull: true, unique: 'uq_merchants_vat' },
        iban: { type: Sequelize.STRING(34), allowNull: false },
        commission_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.0 },
        rating_avg: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
        rating_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        ...ts({ deleted_at: { type: Sequelize.DATE, allowNull: true } }),
      },
      { paranoid: true },
    );
    // commission_rate must be a fraction [0,1].
    await queryInterface.sequelize.query(
      "ALTER TABLE merchants ADD CONSTRAINT chk_merchants_commission CHECK (commission_rate >= 0 AND commission_rate <= 1);",
    );

    // --- merchant_employees -------------------------------------------------
    await queryInterface.createTable(
      'merchant_employees',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        merchant_id: { type: Sequelize.UUID, allowNull: false },
        user_id: { type: Sequelize.UUID, allowNull: false },
        role: {
          type: Sequelize.ENUM('merchant_owner', 'merchant_manager', 'merchant_staff'),
          allowNull: false,
        },
        permissions: { type: Sequelize.JSONB, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts({ deleted_at: { type: Sequelize.DATE, allowNull: true } }),
      },
      { paranoid: true },
    );
    await queryInterface.addIndex('merchant_employees', {
      name: 'uq_merchant_employees',
      unique: true,
      fields: ['merchant_id', 'user_id'],
    });

    // --- merchant_subscriptions --------------------------------------------
    await queryInterface.createTable('merchant_subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchant_id: { type: Sequelize.UUID, allowNull: false },
      plan_id: { type: Sequelize.UUID, allowNull: false },
      status: {
        type: Sequelize.ENUM('active', 'past_due', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      started_at: { type: Sequelize.DATE, allowNull: false },
      current_period_end: { type: Sequelize.DATE, allowNull: false },
      external_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: 'uq_subscriptions_ref',
      },
      ...ts(),
    });

    // --- admin_employees ----------------------------------------------------
    await queryInterface.createTable(
      'admin_employees',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: { type: Sequelize.UUID, allowNull: false, unique: 'uq_admin_user' },
        department: {
          type: Sequelize.ENUM(
            'management',
            'catalog',
            'inventory',
            'fulfillment',
            'finance',
            'support',
          ),
          allowNull: false,
        },
        role: {
          type: Sequelize.ENUM('admin', 'admin_manager', 'admin_staff', 'warehouse_staff'),
          allowNull: false,
          defaultValue: 'admin_staff',
        },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts({ deleted_at: { type: Sequelize.DATE, allowNull: true } }),
      },
      { paranoid: true },
    );

    // --- Foreign keys -------------------------------------------------------
    await queryInterface.addConstraint('merchant_applications', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_applications_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('merchants', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_merchants_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('merchant_employees', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_merchant_employees_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('merchant_employees', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_merchant_employees_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('merchant_subscriptions', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_subscriptions_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('merchant_subscriptions', {
      fields: ['plan_id'],
      type: 'foreign key',
      name: 'fk_subscriptions_plan',
      references: { table: 'plans', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('admin_employees', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_admin_employees_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    const order = [
      'admin_employees',
      'merchant_subscriptions',
      'merchant_employees',
      'merchants',
      'merchant_applications',
      'plans',
    ];
    for (const t of order) {
      await queryInterface.dropTable(t, { cascade: true });
    }
  },
};
