/**
 * Applies ONLY the Stage 3 admin settings migration directly against the live DB.
 *
 * Why a bespoke script (mirrors apply-merchant-extras-migration.js etc.)?
 *  - The .sequelizerc is ESM, which sequelize-cli 6.x (CommonJS) cannot load
 *    cleanly ("Unknown arguments: __esModule, default").
 *  - This is the Stage 3 addition: ONE new table (settings) that did not exist
 *    before. It is idempotent (CREATE TABLE IF NOT EXISTS) and touches ONLY
 *    this table. No existing schema is altered.
 *
 * Run: node scripts/apply-settings-migration.js
 */
import sequelize from '../src/config/database.js';
import env from '../src/config/env.js';

const sql = `
-- --- settings ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        VARCHAR(100) NOT NULL,
  label_ar   VARCHAR(150) NULL,
  value      JSONB        NOT NULL,
  "group"    VARCHAR(50)  NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Unique key constraint (named for clarity / drop support).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_settings_key'
  ) THEN
    ALTER TABLE settings ADD CONSTRAINT uq_settings_key UNIQUE (key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_settings_group ON settings ("group");
`;

async function main() {
  const { db } = env;
  const target = db.dialect === 'sqlite' ? db.storage : `${db.host}:${db.port}/${db.name}`;
  console.log(`Applying admin settings migration on ${db.dialect} → ${target}`);
  await sequelize.authenticate();

  await sequelize.query(sql);
  console.log('✓ settings table ensured.');

  const [rows] = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' " +
      "AND table_name = 'settings'",
  );
  const names = rows.map((r) => (typeof r === 'string' ? r : r.table_name)).filter(Boolean);
  console.log('Verified table present:', names.join(', '));
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Migration failed:', err);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
