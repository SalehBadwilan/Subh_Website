/** Notification — user-facing notifications (in-app + dispatch log). */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      channel: {
        type: DataTypes.ENUM('in_app', 'sms', 'email', 'push'),
        allowNull: false,
        defaultValue: 'in_app',
      },
      title_ar: { type: DataTypes.STRING(150), allowNull: false },
      body_ar: { type: DataTypes.TEXT, allowNull: false },
      payload: { type: DataTypes.JSONB, allowNull: true },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'notifications' },
  );
