/**
 * Applies ONLY the Stage 2 merchant-extras migration directly against the live DB.
 *
 * Why a bespoke script (mirrors apply-otp-migration.js / apply-support-tickets-migration.js)?
 *  - The .sequelizerc is ESM, which sequelize-cli 6.x (CommonJS) cannot load
 *    cleanly ("Unknown arguments: __esModule, default").
 *  - This is the Stage 2 addition: three new tables that did not exist before
 *    (product_update_requests, settlements, subscription_change_requests).
 *    It is idempotent (CREATE ... IF NOT EXISTS) and touches ONLY these three
 *    tables. No existing schema is altered.
 *
 * Run: node scripts/apply-merchant-extras-migration.js
 */
import sequelize from '../src/config/database.js';
import env from '../src/config/env.js';

const sql = `
-- --- product_update_requests -----------------------------------------------
CREATE TABLE IF NOT EXISTS product_update_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         UUID         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  merchant_product_id UUID         NULL,
  product_id          UUID         NULL,
  package_id          UUID         NULL,
  requested_change    JSONB        NOT NULL,
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','under_review','approved','rejected','applied')),
  reason_ar           TEXT         NULL,
  requested_by        UUID         NOT NULL,
  reviewed_by         UUID         NULL,
  reviewed_at         TIMESTAMPTZ  NULL,
  rejection_reason    TEXT         NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_pur_merchant ON product_update_requests (merchant_id);
CREATE INDEX IF NOT EXISTS idx_pur_status   ON product_update_requests (status);

-- --- settlements -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS settlements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      UUID         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  period_from      TIMESTAMPTZ  NULL,
  period_to        TIMESTAMPTZ  NULL,
  gross_sales_sar  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gross_sales_sar >= 0),
  commission_sar   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (commission_sar >= 0),
  refunds_sar      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refunds_sar >= 0),
  net_payable_sar  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (net_payable_sar >= 0),
  currency         VARCHAR(3)   NOT NULL DEFAULT 'SAR',
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','paid','failed')),
  paid_at          TIMESTAMPTZ  NULL,
  reference        VARCHAR(150) NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_merchant ON settlements (merchant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status   ON settlements (status);

-- --- subscription_change_requests -----------------------------------------
CREATE TABLE IF NOT EXISTS subscription_change_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        UUID         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  current_plan_id    UUID         NULL REFERENCES plans(id) ON DELETE SET NULL,
  requested_plan_id  UUID         NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  change_type        VARCHAR(20)  NOT NULL DEFAULT 'change_period'
                       CHECK (change_type IN ('upgrade','downgrade','change_period')),
  reason_ar          TEXT         NULL,
  status             VARCHAR(20)  NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected','applied')),
  requested_by       UUID         NOT NULL,
  reviewed_by        UUID         NULL,
  reviewed_at        TIMESTAMPTZ  NULL,
  rejection_reason   TEXT         NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_scr_merchant ON subscription_change_requests (merchant_id);
`;

async function main() {
  const { db } = env;
  const target = db.dialect === 'sqlite' ? db.storage : `${db.host}:${db.port}/${db.name}`;
  console.log(`Applying merchant-extras migration on ${db.dialect} → ${target}`);
  await sequelize.authenticate();

  await sequelize.query(sql);
  console.log('✓ product_update_requests / settlements / subscription_change_requests ensured.');

  // Quick verification.
  const [rows] = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' " +
      "AND table_name IN ('product_update_requests','settlements','subscription_change_requests') ORDER BY table_name",
  );
  const names = rows.map((r) => (typeof r === 'string' ? r : r.table_name)).filter(Boolean);
  console.log('Verified tables present:', names.join(', '));
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Migration failed:', err);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
