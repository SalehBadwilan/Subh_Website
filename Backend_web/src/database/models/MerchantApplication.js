/** MerchantApplication — tracks a user's application to become a merchant. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'MerchantApplication',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Snapshot of the application payload (CR, bank IBAN, etc.).
      commercial_name: { type: DataTypes.STRING(150), allowNull: false },
      commercial_registration_no: { type: DataTypes.STRING(50), allowNull: false },
      vat_number: { type: DataTypes.STRING(50), allowNull: true },
      iban: { type: DataTypes.STRING(34), allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      reviewed_by: { type: DataTypes.UUID, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'merchant_applications', paranoid: true },
  );
