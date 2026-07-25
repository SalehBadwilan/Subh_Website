'use strict';

/**
 * Migration: Stage 2 — Merchant extras.
 *
 * Adds three append-only / request tables used by the Merchant & Merchant
 * Employee APIs:
 *
 *   product_update_requests
 *     A merchant cannot edit catalog products directly (Subh owns the catalog).
 *     Instead it submits a request describing the proposed change (price,
 *     description, status, …) which Subh reviews. This satisfies:
 *       "لا تسمح بتعديل بيانات المنتج مباشرة من التاجر إذا كان المطلوب Update Request."
 *
 *   settlements
 *     Payout ledger rows owed to a merchant for delivered+captured orders,
 *     net of platform commission. Read-only views for the merchant (MVP does
 *     not auto-generate settlements; rows are seeded by Subh finance later).
 *
 *   subscription_change_requests
 *     A merchant's request to change its active plan. Subh reviews + applies.
 *
 * The migration is intentionally additive: no existing table is altered.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = (extra = {}) => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      ...extra,
    });

    // --- product_update_requests -------------------------------------------
    await queryInterface.createTable(
      'product_update_requests',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        merchant_id: { type: Sequelize.UUID, allowNull: false },
        // What the merchant is allowed to sell (one of product/package).
        merchant_product_id: { type: Sequelize.UUID, allowNull: true },
        product_id: { type: Sequelize.UUID, allowNull: true },
        package_id: { type: Sequelize.UUID, allowNull: true },
        // requested_change is a JSONB blob describing the proposed field edits
        // (e.g. { price_sar: 49, description_ar: "..." }). Stored verbatim so
        // the reviewer sees exactly what the merchant asked for.
        requested_change: { type: Sequelize.JSONB, allowNull: false },
        // pending | under_review | approved | rejected | applied
        status: {
          type: Sequelize.ENUM('pending', 'under_review', 'approved', 'rejected', 'applied'),
          allowNull: false,
          defaultValue: 'pending',
        },
        reason_ar: { type: Sequelize.TEXT, allowNull: true },
        requested_by: { type: Sequelize.UUID, allowNull: false },
        reviewed_by: { type: Sequelize.UUID, allowNull: true },
        reviewed_at: { type: Sequelize.DATE, allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        ...ts({ deleted_at: { type: Sequelize.DATE, allowNull: true } }),
      },
      { paranoid: true },
    );
    await queryInterface.addIndex('product_update_requests', {
      fields: ['merchant_id'],
      name: 'idx_pur_merchant',
    });
    await queryInterface.addIndex('product_update_requests', {
      fields: ['status'],
      name: 'idx_pur_status',
    });

    // --- settlements --------------------------------------------------------
    await queryInterface.createTable('settlements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchant_id: { type: Sequelize.UUID, allowNull: false },
      // Optional grouping: a settlement may cover one period or a single order.
      period_from: { type: Sequelize.DATE, allowNull: true },
      period_to: { type: Sequelize.DATE, allowNull: true },
      // Gross captured sales for the period (SAR, ex-VAT already — what the
      // merchant earned before commission).
      gross_sales_sar: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      // Platform commission deducted (gross * merchant.commission_rate).
      commission_sar: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      // Refunds deducted in the period.
      refunds_sar: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      // Net payable to the merchant = gross - commission - refunds.
      net_payable_sar: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'SAR' },
      // pending | processing | paid | failed
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'paid', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      reference: { type: Sequelize.STRING(150), allowNull: true },
      ...ts(),
    });
    await queryInterface.addIndex('settlements', {
      fields: ['merchant_id'],
      name: 'idx_settlements_merchant',
    });
    await queryInterface.addIndex('settlements', {
      fields: ['status'],
      name: 'idx_settlements_status',
    });

    // --- subscription_change_requests --------------------------------------
    await queryInterface.createTable(
      'subscription_change_requests',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        merchant_id: { type: Sequelize.UUID, allowNull: false },
        current_plan_id: { type: Sequelize.UUID, allowNull: true },
        requested_plan_id: { type: Sequelize.UUID, allowNull: false },
        // upgrade | downgrade | change_period
        change_type: {
          type: Sequelize.ENUM('upgrade', 'downgrade', 'change_period'),
          allowNull: false,
          defaultValue: 'change_period',
        },
        reason_ar: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected', 'applied'),
          allowNull: false,
          defaultValue: 'pending',
        },
        requested_by: { type: Sequelize.UUID, allowNull: false },
        reviewed_by: { type: Sequelize.UUID, allowNull: true },
        reviewed_at: { type: Sequelize.DATE, allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        ...ts({ deleted_at: { type: Sequelize.DATE, allowNull: true } }),
      },
      { paranoid: true },
    );
    await queryInterface.addIndex('subscription_change_requests', {
      fields: ['merchant_id'],
      name: 'idx_scr_merchant',
    });

    // --- Foreign keys -------------------------------------------------------
    await queryInterface.addConstraint('product_update_requests', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_pur_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('settlements', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_settlements_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('subscription_change_requests', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_scr_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('subscription_change_requests', {
      fields: ['requested_plan_id'],
      type: 'foreign key',
      name: 'fk_scr_requested_plan',
      references: { table: 'plans', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('subscription_change_requests', {
      fields: ['current_plan_id'],
      type: 'foreign key',
      name: 'fk_scr_current_plan',
      references: { table: 'plans', field: 'id' },
      onDelete: 'SET NULL',
    });

    // --- CHECK constraints (kept dialect-safe; PG-only raw SQL is fine here
    //     because the project canonical DB is PostgreSQL.) ------------------
    await queryInterface.sequelize.query(
      'ALTER TABLE settlements ADD CONSTRAINT chk_settlements_net ' +
        'CHECK (net_payable_sar >= 0 AND gross_sales_sar >= 0 AND commission_sar >= 0 AND refunds_sar >= 0);',
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE product_update_requests ADD CONSTRAINT chk_pur_change " +
        "CHECK (requested_change IS NOT NULL AND jsonb_typeof(requested_change::jsonb) = 'object');",
    );
  },

  async down(queryInterface) {
    for (const t of [
      'subscription_change_requests',
      'settlements',
      'product_update_requests',
    ]) {
      await queryInterface.dropTable(t, { cascade: true });
    }
    // Drop the enum types created by PG so a re-run is clean.
    try {
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS enum_subscription_change_requests_status CASCADE;" +
          " DROP TYPE IF EXISTS enum_subscription_change_requests_change_type CASCADE;" +
          " DROP TYPE IF EXISTS enum_settlements_status CASCADE;" +
          " DROP TYPE IF EXISTS enum_product_update_requests_status CASCADE;",
      );
    } catch {
      /* non-fatal on non-PG dialects */
    }
  },
};
