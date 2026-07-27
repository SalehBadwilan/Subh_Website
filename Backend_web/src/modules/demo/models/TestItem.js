/**
 * TestItem — demo model to prove the DB wiring works end-to-end.
 *
 * This is intentionally trivial. Real domain models (Product, Order, ...)
 * belong to future modules and are NOT part of today's deliverable.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

const TestItem = sequelize.define(
  'TestItem',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'test_items',
    timestamps: false, // we manage createdAt manually to keep the demo minimal
  },
);

export default TestItem;
