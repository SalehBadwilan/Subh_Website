/**
 * Sequelize CLI config (CommonJS — Sequelize CLI expects this shape).
 *
 * Reads environment variables via src/config/env.js. AI_API_KEY and other
 * secrets are never read here.
 */
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'postgres';
const isSqlite = dialect === 'sqlite';

module.exports = {
  development: {
    dialect,
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'subh_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    storage: isSqlite ? process.env.DB_STORAGE || './data/subh.sqlite' : undefined,
    logging: false,
    define: {
      underscored: true, // snake_case columns
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  test: {
    dialect,
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'subh_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    storage: isSqlite ? process.env.DB_STORAGE || './data/subh_test.sqlite' : undefined,
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect,
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
};
