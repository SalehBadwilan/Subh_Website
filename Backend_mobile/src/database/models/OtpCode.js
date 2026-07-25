/**
 * OtpCode — one-time-password issued for phone-based authentication.
 *
 * Only a hash of the code is stored (SHA-256). The raw code is returned to the
 * caller ONLY in development (devOtp) for testing; it is never persisted in
 * plaintext.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'OtpCode',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      code_hash: { type: DataTypes.STRING, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      is_used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'otp_codes',
      // createdAt/updatedAt managed by Sequelize with underscored names.
      underscored: true,
    },
  );
