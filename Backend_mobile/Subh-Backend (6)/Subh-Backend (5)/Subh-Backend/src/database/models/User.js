/** User — the unified identity. Account-type specific data lives in linked rows. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.CITEXT, // case-insensitive on PG; falls back on others
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true },
      },
      // Stored ONLY as a bcrypt hash. Never plaintext, never logged.
      password_hash: { type: DataTypes.STRING, allowNull: false },
      full_name: { type: DataTypes.STRING(150), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_guest: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      email_verified_at: { type: DataTypes.DATE, allowNull: true },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'users', paranoid: true },
  );
