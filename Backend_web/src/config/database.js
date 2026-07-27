/**
 * Database connection & model loader for Subh Backend.
 * Supports direct connection string (DATABASE_URL) with mandatory SSL for Supabase/Railway.
 */
import { Sequelize } from 'sequelize';
import env from './env.js';
import logger from './logger.js';

// 1. إعدادات الـ SSL للاتصال بـ Supabase
const isProduction = process.env.NODE_ENV === 'production' || env.isProd;
const useSsl = ['true', '1', 'yes'].includes((process.env.DB_SSL || '').toLowerCase()) || isProduction;

const dialectOptions = (useSsl && env.db?.dialect !== 'sqlite')
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

// 2. إنشاء كائن Sequelize المباشر
export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: env.db?.dialect || 'postgres',
      dialectOptions,
      logging: env.isProd ? false : (msg) => logger.debug(msg),
      define: {
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    })
  : new Sequelize(
      env.db?.name || process.env.DB_NAME || 'subh_dev',
      env.db?.user || process.env.DB_USER || 'postgres',
      env.db?.password || process.env.DB_PASSWORD || '',
      {
        host: env.db?.host || process.env.DB_HOST || 'localhost',
        port: Number.parseInt(env.db?.port || process.env.DB_PORT || '5432', 10),
        dialect: env.db?.dialect || 'postgres',
        dialectOptions,
        logging: env.isProd ? false : (msg) => logger.debug(msg),
        define: {
          underscored: true,
          timestamps: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      }
    );

/**
 * فحص الاتصال بقاعدة البيانات
 */
export async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL / Supabase connection authenticated successfully.');
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    throw error;
  }
}

/**
 * الدالة التي يستدعيها app.js لبدء قاعدة البيانات وتسجيل النماذج (Models)
 */
export async function bootDatabase() {
  // فحص الاتصال أولاً
  await testDatabaseConnection();

  // جلب كافة الـ Models المسجلة
  const models = sequelize.models || {};

  // إذا كان لديك دالة لتسجيل العلاقات (Associations) يمكنك استدعاؤها هنا تلقائياً
  Object.values(models).forEach((model) => {
    if (typeof model.associate === 'function') {
      model.associate(models);
    }
  });

  return { sequelize, models };
}

export default sequelize;