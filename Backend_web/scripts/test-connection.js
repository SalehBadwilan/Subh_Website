/**
 * Connection smoke test against the configured database.
 *
 * Runs:
 *   1. sequelize.authenticate()  — proves the connection works.
 *   2. SELECT COUNT(*) FROM users — proves the `users` table exists and is
 *      readable with the current credentials.
 *
 * This script does NOT create tables, run migrations, or apply schema.sql.
 * Tables are assumed to already exist (e.g. loaded into Supabase beforehand).
 *
 * Usage:  node scripts/test-connection.js
 */
import sequelize from '../src/config/database.js';
import env from '../src/config/env.js';

async function main() {
  const { db } = env;
  const target = db.dialect === 'sqlite' ? db.storage : `${db.host}:${db.port}/${db.name}`;
  console.log(`\n[1/3] Connecting to ${db.dialect} → ${target} (ssl=${db.ssl})`);

  // 1) Authenticate ----------------------------------------------------------
  try {
    await sequelize.authenticate();
    console.log('      ✅ authenticate() succeeded.');
  } catch (err) {
    console.error('      ❌ authenticate() FAILED:');
    console.error('         ', err.message);
    if (err.parent) console.error('         parent:', err.parent.message);
    process.exitCode = 1;
    return;
  }

  // 2) Table existence check -------------------------------------------------
  try {
    const [rows] = await sequelize.query(
      `SELECT to_regclass('public.users') AS exists;`,
    );
    const exists = rows[0]?.exists === 'users';
    console.log(`\n[2/3] Table 'users' exists? ${exists ? '✅ YES' : '❌ NO'}`);
    if (!exists) {
      console.error('      The users table was not found. Run schema.sql first.');
      process.exitCode = 1;
      return;
    }
  } catch (err) {
    console.error('\n[2/3] ❌ Table existence check FAILED:');
    console.error('         ', err.message);
    process.exitCode = 1;
    return;
  }

  // 3) COUNT(*) FROM users ---------------------------------------------------
  try {
    const [rows] = await sequelize.query(`SELECT COUNT(*)::int AS count FROM users;`);
    const count = rows[0]?.count ?? 0;
    console.log(`\n[3/3] SELECT COUNT(*) FROM users → ✅ ${count}`);
  } catch (err) {
    console.error('\n[3/3] ❌ COUNT query FAILED:');
    console.error('         ', err.message);
    process.exitCode = 1;
    return;
  }

  console.log('\n=== RESULT ===');
  console.log('Connection : OK');
  console.log('users table: present');
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
