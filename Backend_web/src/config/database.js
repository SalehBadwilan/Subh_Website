/**
 * Database connection & model loader for Subh Backend.
 * Configured for Railway + Supabase with IPv4 enforcement and mandatory SSL.
 */
import { Sequelize } from 'sequelize';
import env from './env.js';
import logger from './logger.js';

// 1. تحديد إعدادات الـ SSL وتحديد بروتوكول IPv4 لمكافحة خطأ ENETUNREACH في Railway
const isProduction = process.env.NODE_ENV === 'production' || env.isProd;
const useSsl = ['true', '1', 'yes'].includes((process.env.DB_SSL || '').toLowerCase()) || isProduction;

const dialectOptions = (useSsl && env.db?.dialect !== 'sqlite')
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false, // تجاوز رفض الشهادات بين Railway و Supabase
      },
      family: 4, // إجبار الاتصال عبر IPv4 فقط لتفادي مشاكل IPv6
    }
  : {
      family: 4,
    };

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
 * دالة فحص واختبار الاتصال بقاعدة البيانات
 */
export async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connection to Supabase PostgreSQL established successfully via IPv4.');
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    throw error;
  }
}

/**
 * دالة تهيئة قاعدة البيانات وتسجيل الـ Models (تُستدعى في app.js)
 */
export async function bootDatabase() {
  // فحص الاتصال أولاً
  await testDatabaseConnection();

  // جلب النماذج المسجلة
  const models = sequelize.models || {};

  // تفعيل العلاقات بين الـ Models إذا كانت معرفة
  Object.values(models).forEach((model) => {
    if (typeof model.associate === 'function') {
      model.associate(models);
    }
  });

  return { sequelize, models };
}

export default sequelize;