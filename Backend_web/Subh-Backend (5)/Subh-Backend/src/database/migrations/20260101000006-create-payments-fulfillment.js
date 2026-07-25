'use strict';

/** Migration: shipments, payments, payment_events, refunds, invoices, notifications, audit_logs. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = () => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- shipments ----------------------------------------------------------
    await queryInterface.createTable('shipments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: { type: Sequelize.UUID, allowNull: false, unique: 'uq_shipments_order' },
      carrier: { type: Sequelize.STRING(100), allowNull: true },
      tracking_number: { type: Sequelize.STRING(100), allowNull: true },
      status: {
        type: Sequelize.ENUM(
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
      shipped_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      ...ts(),
    });

    // --- payments -----------------------------------------------------------
    await queryInterface.createTable(
      'payments',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        order_id: { type: Sequelize.UUID, allowNull: false },
        provider: { type: Sequelize.STRING(50), allowNull: false },
        // UNIQUE → repeated webhook about the same payment is a no-op.
        provider_reference: {
          type: Sequelize.STRING(150),
          allowNull: true,
          unique: 'uq_payments_ref',
        },
        method: {
          type: Sequelize.ENUM('card', 'apple_pay', 'mada', 'stc_pay', 'transfer', 'wallet'),
          allowNull: false,
        },
        amount_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'SAR' },
        status: {
          type: Sequelize.ENUM('initiated', 'authorized', 'captured', 'failed', 'refunded', 'disputed'),
          allowNull: false,
          defaultValue: 'initiated',
        },
        captured_at: { type: Sequelize.DATE, allowNull: true },
        ...ts({ deleted_at: { type: Sequelize.DATE, allowNull: true } }),
      },
      { paranoid: true },
    );

    // --- payment_events -----------------------------------------------------
    await queryInterface.createTable('payment_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      payment_id: { type: Sequelize.UUID, allowNull: false },
      event_id: { type: Sequelize.STRING(150), allowNull: false, unique: 'uq_payment_events_id' },
      event_type: { type: Sequelize.STRING(100), allowNull: false },
      status: { type: Sequelize.STRING(50), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      received_at: { type: Sequelize.DATE, allowNull: false },
      ...ts(),
    });

    // --- refunds ------------------------------------------------------------
    await queryInterface.createTable('refunds', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      payment_id: { type: Sequelize.UUID, allowNull: false },
      order_id: { type: Sequelize.UUID, allowNull: false },
      amount_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      reason_ar: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      provider_reference: {
        type: Sequelize.STRING(150),
        allowNull: true,
        unique: 'uq_refunds_ref',
      },
      ...ts(),
    });

    // --- invoices -----------------------------------------------------------
    await queryInterface.createTable('invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: { type: Sequelize.UUID, allowNull: false, unique: 'uq_invoices_order' },
      number: { type: Sequelize.STRING(30), allowNull: false, unique: 'uq_invoices_number' },
      issued_at: { type: Sequelize.DATE, allowNull: false },
      buyer_name: { type: Sequelize.STRING(150), allowNull: false },
      buyer_vat_number: { type: Sequelize.STRING(50), allowNull: true },
      subtotal_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      vat_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      total_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      pdf_url: { type: Sequelize.STRING(1024), allowNull: true },
      ...ts(),
    });

    // --- notifications ------------------------------------------------------
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      channel: {
        type: Sequelize.ENUM('in_app', 'sms', 'email', 'push'),
        allowNull: false,
        defaultValue: 'in_app',
      },
      title_ar: { type: Sequelize.STRING(150), allowNull: false },
      body_ar: { type: Sequelize.TEXT, allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: Sequelize.DATE, allowNull: true },
      ...ts(),
    });

    // --- audit_logs ---------------------------------------------------------
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      actor_id: { type: Sequelize.UUID, allowNull: true },
      actor_type: { type: Sequelize.STRING(30), allowNull: true },
      action: { type: Sequelize.STRING(80), allowNull: false },
      entity_type: { type: Sequelize.STRING(50), allowNull: false },
      entity_id: { type: Sequelize.UUID, allowNull: true },
      before: { type: Sequelize.JSONB, allowNull: true },
      after: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.INET, allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      // Append-only: only created_at.
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // --- Indexes ------------------------------------------------------------
    await queryInterface.addIndex('payments', { fields: ['order_id'], name: 'idx_payments_order' });
    await queryInterface.addIndex('payment_events', { fields: ['payment_id'], name: 'idx_payment_events_payment' });
    await queryInterface.addIndex('refunds', { fields: ['payment_id'], name: 'idx_refunds_payment' });
    await queryInterface.addIndex('refunds', { fields: ['order_id'], name: 'idx_refunds_order' });
    await queryInterface.addIndex('notifications', { fields: ['user_id'], name: 'idx_notifications_user' });
    await queryInterface.addIndex('audit_logs', { fields: ['entity_type', 'entity_id'], name: 'idx_audit_entity' });
    await queryInterface.addIndex('audit_logs', { fields: ['actor_id'], name: 'idx_audit_actor' });
    await queryInterface.addIndex('audit_logs', { fields: ['action'], name: 'idx_audit_action' });

    // --- Foreign keys -------------------------------------------------------
    await queryInterface.addConstraint('shipments', {
      fields: ['order_id'],
      type: 'foreign key',
      name: 'fk_shipments_order',
      references: { table: 'orders', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('payments', {
      fields: ['order_id'],
      type: 'foreign key',
      name: 'fk_payments_order',
      references: { table: 'orders', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('payment_events', {
      fields: ['payment_id'],
      type: 'foreign key',
      name: 'fk_payment_events_payment',
      references: { table: 'payments', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('refunds', {
      fields: ['payment_id'],
      type: 'foreign key',
      name: 'fk_refunds_payment',
      references: { table: 'payments', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('refunds', {
      fields: ['order_id'],
      type: 'foreign key',
      name: 'fk_refunds_order',
      references: { table: 'orders', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('invoices', {
      fields: ['order_id'],
      type: 'foreign key',
      name: 'fk_invoices_order',
      references: { table: 'orders', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('notifications', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_notifications_user',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    const order = [
      'audit_logs',
      'notifications',
      'invoices',
      'refunds',
      'payment_events',
      'payments',
      'shipments',
    ];
    for (const t of order) {
      await queryInterface.dropTable(t, { cascade: true });
    }
  },
};
