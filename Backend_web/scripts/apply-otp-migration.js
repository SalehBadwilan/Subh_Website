/**
 * Applies ONLY the otp_codes migration directly against the live database.
 *
 * Why a bespoke script instead of `sequelize-cli db:migrate`?
 *  - The .sequelizerc is ESM, which sequelize-cli 6.x (CommonJS) cannot load
 *    cleanly ("Unknown arguments: __esModule, default").
 *  - We must NOT run the full migration set — the other 6 migrations describe
 *    tables that ALREADY exist in Supabase, and re-running them would error
 *    or duplicate work.
 *
 * This script is idempotent (CREATE TABLE IF NOT EXISTS) and touches ONLY the
 * otp_codes table. No other schema is affected.
 */
import sequelize from '../src/config/database.js';
import env from '../src/config/env.js';

const sql = `
CREATE TABLE IF NOT EXISTS otp_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20)  NOT NULL,
  code_hash     VARCHAR      NOT NULL,
  expires_at    TIMESTAMPTZ  NOT NULL,
  is_used       BOOLEAN      NOT NULL DEFAULT FALSE,
  attempts      INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone
  ON otp_codes (phone);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_used_expires
  ON otp_codes (phone, is_used, expires_at);
`;

async function main() {
  const { db } = env;
  const target = db.dialect === 'sqlite' ? db.storage : `${db.host}:${db.port}/${db.name}`;
  console.log(`Applying otp_codes migration on ${db.dialect} → ${target}`);
  await sequelize.authenticate();
  await sequelize.query(sql);

  const [chk] = await sequelize.query(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'otp_codes';`,
  );
  console.log('otp_codes column count:', chk[0]?.n);
  console.log('✅ otp_codes migration applied.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    if (err.parent) console.error('  parent:', err.parent.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
