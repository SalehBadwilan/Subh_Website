'use strict';

/**
 * Migration: otp_codes.
 *
 * Stores one-time-password codes issued for phone-based authentication.
 * A code is valid for OTP_TTL_MINUTES (default 5) and can be used once.
 * Older unused codes for the same phone are revoked (is_used stays false but
 * expires_at is forced into the past) — handled at the application layer.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_codes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      code_hash: { type: Sequelize.STRING, allowNull: false },
      // SHA-256 of the OTP, so the raw code is never stored in plaintext.
      expires_at: { type: Sequelize.DATE, allowNull: false },
      is_used: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });

    // Lookup by phone, ordered by creation, filtered by usage/expiry.
    await queryInterface.addIndex('otp_codes', {
      name: 'idx_otp_codes_phone',
      fields: ['phone'],
    });
    await queryInterface.addIndex('otp_codes', {
      name: 'idx_otp_codes_phone_used_expires',
      fields: ['phone', 'is_used', 'expires_at'],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('otp_codes', { cascade: true });
  },
};
