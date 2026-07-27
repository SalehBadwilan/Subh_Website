/**
 * Database connection (Sequelize) — shared by the Express app AND the model
 * registry. Modular Monolith: all 33 tables are declared under
 * src/database/models and wired together via setupAssociations.
 */
import { Sequelize } from 'sequelize';
import env from './env.js';

const { db } = env;

const sequelize = new Sequelize(db.name, db.user, db.password, {
  dialect: db.dialect,
  host: db.host,
  port: db.port,
  storage: db.dialect === 'sqlite' ? db.storage : undefined,
  // Supabase (and most managed Postgres providers) require TLS. We use a
  // permissive SSL config because Supabase certs don't pin to a known CA in
  // the default trust store; stricter validation can be enabled via env later.
  dialectOptions: db.ssl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  logging: env.isProd ? false : (msg) => console.debug(`[sequelize] ${msg}`),
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

/**
 * Ping the database. Used by /api/health and by bootApp.
 * Returns a normalized status object — never throws.
 */
export async function testDatabaseConnection() {
  const started = Date.now();
  try {
    await sequelize.authenticate();
    return {
      status: 'connected',
      dialect: db.dialect,
      host: db.dialect === 'sqlite' ? db.storage : `${db.host}:${db.port}`,
      database: db.name,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      dialect: db.dialect,
      error: error.message,
      latencyMs: Date.now() - started,
    };
  }
}

/**
 * Boot the full data layer: authenticate, register all models, then wire
 * associations. Idempotent.
 */
export async function bootDatabase() {
  await sequelize.authenticate();
  const { initModels } = await import('../database/models/index.js');
  const models = initModels(sequelize, Sequelize);
  return { sequelize, models };
}

export default sequelize;
