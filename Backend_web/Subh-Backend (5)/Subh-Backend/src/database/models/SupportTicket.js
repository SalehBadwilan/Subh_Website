/**
 * SupportTicket — a customer support request (POST /api/support/tickets).
 *
 * Added in the Customer APIs phase because no existing table represents a
 * free-form customer support request. It is intentionally minimal: subject +
 * message + an optional order reference + a status the support team advances.
 * Keeping it separate from notifications (which are outbound) and audit logs
 * (which are internal) preserves a clean responsibility split.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'SupportTicket',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      // Optional link to the order the ticket is about (if any).
      order_id: { type: DataTypes.UUID, allowNull: true },
      subject_ar: { type: DataTypes.STRING(200), allowNull: false },
      message_ar: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      // Optional category tag to route the ticket (billing, delivery, product...).
      category: { type: DataTypes.STRING(50), allowNull: true },
    },
    { tableName: 'support_tickets', paranoid: true },
  );
