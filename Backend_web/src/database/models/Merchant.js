/** Merchant — profile + commercial data for an approved merchant user. */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Merchant',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'terminated'),
        allowNull: false,
        defaultValue: 'active',
      },
      commercial_name: { type: DataTypes.STRING(150), allowNull: false },
      commercial_registration_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      vat_number: { type: DataTypes.STRING(50), allowNull: true, unique: true },
      iban: { type: DataTypes.STRING(34), allowNull: false },
      commission_rate: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0.0,
        validate: { min: 0, max: 1 },
      },
      rating_avg: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
      rating_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      approved_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'merchants', paranoid: true },
  );
