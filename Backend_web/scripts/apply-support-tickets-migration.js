/**
 * Applies ONLY the support_tickets migration directly against the live DB.
 *
 * Why a bespoke script (mirrors apply-otp-migration.js)?
 *  - The .sequelizerc is ESM, which sequelize-cli 6.x (CommonJS) cannot load
 *    cleanly ("Unknown arguments: __esModule, default").
 *  - This is the Customer APIs addition: a single new table that did not exist
 *    before. It is idempotent (CREATE TABLE IF NOT EXISTS) and touches ONLY
 *    support_tickets. No existing schema is altered.
 */
import sequelize from '../src/config/database.js';
import env from '../src/config/env.js';

const sql = `
CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      UUID         NULL REFERENCES orders(id) ON DELETE SET NULL,
  subject_ar    VARCHAR(200) NOT NULL,
  message_ar    TEXT         NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','resolved','closed')),
  category      VARCHAR(50)  NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
  ON support_tickets (user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets (status);
`;

async function main() {
  const { db } = env;
  const target = db.dialect === 'sqlite' ? db.storage : `${db.host}:${db.port}/${db.name}`;
  console.log(`Applying support_tickets migration on ${db.dialect} → ${target}`);
  await sequelize.authenticate();
  await sequelize.query(sql);

  const [chk] = await sequelize.query(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'support_tickets';`,
  );
  console.log('support_tickets column count:', chk[0]?.n);
  console.log('✅ support_tickets migration applied.');
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
