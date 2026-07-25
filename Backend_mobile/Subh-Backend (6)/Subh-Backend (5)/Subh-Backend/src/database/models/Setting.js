/**
 * Setting — platform-wide key/value settings owned by the admin (Stage 3).
 *
 * Stored as a single-row-per-key table. Values are JSONB so a key may carry
 * scalars or small structured documents (e.g. commission defaults, contact
 * info, feature flags). This keeps the design consistent with the rest of the
 * project (timestamps + underscored naming) and avoids adding a second table.
 *
 * Only Admin (full) may write; Admin Employee reads via GET /api/admin/settings.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Setting',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // Stable identifier used by code (e.g. 'platform.commission_default').
      key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      // Human label in Arabic (for admin UI display).
      label_ar: { type: DataTypes.STRING(150), allowNull: true },
      // JSONB so any scalar/structure is storable without migration churn.
      value: { type: DataTypes.JSONB, allowNull: false },
      // Optional grouping for UI organization (e.g. 'finance', 'general').
      group: { type: DataTypes.STRING(50), allowNull: true },
    },
    { tableName: 'settings' },
  );
