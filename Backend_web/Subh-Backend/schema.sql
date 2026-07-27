-- =============================================================================
-- Subh Backend — Database Schema (Supabase / PostgreSQL)
-- =============================================================================
-- Generated from the Sequelize models & migrations for the "Subh" platform
-- (Modular Monolith). This single file is the canonical schema: it contains
-- every CREATE TABLE, foreign key, index, unique constraint and CHECK
-- constraint used by the v1 (MVP) backend.
--
-- Target:  PostgreSQL 14+  (also runs on Supabase as-is).
-- Conventions:
--   * snake_case identifiers
--   * UUID primary keys (default gen_random_uuid())
--   * created_at / updated_at via triggers
--   * soft delete via deleted_at on sensitive tables
--   * monetary amounts DECIMAL(10,2) in SAR
--   * ENUMs declared as proper PG types
--
-- Usage on Supabase:
--   Dashboard → SQL Editor → New query → paste this file → Run.
-- Usage on plain PostgreSQL:
--   psql "$DATABASE_URL" -f schema.sql
--
-- NOTE on open product questions (documented as MVP assumptions):
--   1. Prices are VAT-INCLUSIVE at display; vat_rate stored for breakdown.
--   2. An order belongs to a SINGLE merchant in v1 (multi-merchant carts are
--      split at checkout via parent_order_id).
--   3. Guest checkout is permitted (carts.user_id nullable, is_guest flag).
--   4. Stock is deducted at payment capture; reservations hold units until then.
-- =============================================================================

-- ---- Extensions -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- fallback uuid generator

-- =============================================================================
-- ENUM TYPES
-- =============================================================================
CREATE TYPE role_scope           AS ENUM ('global', 'merchant');
CREATE TYPE application_status   AS ENUM ('pending', 'under_review', 'approved', 'rejected');
CREATE TYPE merchant_status      AS ENUM ('active', 'suspended', 'terminated');
CREATE TYPE merchant_emp_role    AS ENUM ('merchant_owner', 'merchant_manager', 'merchant_staff');
CREATE TYPE billing_period       AS ENUM ('monthly', 'quarterly', 'yearly');
CREATE TYPE subscription_status  AS ENUM ('active', 'past_due', 'cancelled', 'expired');
CREATE TYPE admin_department     AS ENUM ('management', 'catalog', 'inventory', 'fulfillment', 'finance', 'support');
CREATE TYPE admin_role           AS ENUM ('admin', 'admin_manager', 'admin_staff', 'warehouse_staff');
CREATE TYPE catalog_status       AS ENUM ('draft', 'active', 'archived');
CREATE TYPE sellable_type        AS ENUM ('product', 'package');
CREATE TYPE reservation_status   AS ENUM ('active', 'consumed', 'released');
CREATE TYPE stock_movement_type  AS ENUM ('restock', 'reserve', 'release', 'consume', 'adjustment', 'return');
CREATE TYPE cart_status          AS ENUM ('active', 'converted', 'abandoned');
CREATE TYPE order_status         AS ENUM ('pending_payment', 'paid', 'preparing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'returned');
CREATE TYPE shipment_status      AS ENUM ('pending', 'packed', 'handed_to_carrier', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned');
CREATE TYPE payment_method       AS ENUM ('card', 'apple_pay', 'mada', 'stc_pay', 'transfer', 'wallet');
CREATE TYPE payment_status       AS ENUM ('initiated', 'authorized', 'captured', 'failed', 'refunded', 'disputed');
CREATE TYPE refund_status        AS ENUM ('pending', 'approved', 'completed', 'rejected');
CREATE TYPE notification_channel AS ENUM ('in_app', 'sms', 'email', 'push');

-- =============================================================================
-- SHARED HELPER: updated_at trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION subh_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. IDENTITY & RBAC
-- =============================================================================

-- ---- roles ------------------------------------------------------------------
CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(50)  NOT NULL,
  name_ar       VARCHAR(100) NOT NULL,
  description_ar VARCHAR(255),
  scope         role_scope   NOT NULL DEFAULT 'global',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_roles_slug UNIQUE (slug)
);
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- permissions ------------------------------------------------------------
CREATE TABLE permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100) NOT NULL,
  description_ar VARCHAR(255),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_permissions_slug UNIQUE (slug)
);
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- users ------------------------------------------------------------------
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            CITEXT       NOT NULL,
  phone            VARCHAR(20)  NOT NULL,
  password_hash    VARCHAR      NOT NULL,
  full_name        VARCHAR(150) NOT NULL,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  is_guest         BOOLEAN      NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_phone UNIQUE (phone)
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();
CREATE INDEX idx_users_deleted_at ON users (deleted_at);

-- ---- role_permissions (join) -----------------------------------------------
CREATE TABLE role_permissions (
  role_id       UUID NOT NULL,
  permission_id UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role       FOREIGN KEY (role_id)       REFERENCES roles (id)       ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);
CREATE TRIGGER trg_role_permissions_updated_at BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- user_roles -------------------------------------------------------------
CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  role_id     UUID NOT NULL,
  merchant_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_roles_user   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role   FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX uq_user_roles_assignment ON user_roles (user_id, role_id, merchant_id);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);
CREATE TRIGGER trg_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- addresses --------------------------------------------------------------
CREATE TABLE addresses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  recipient_name VARCHAR(150) NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  line1          VARCHAR(255) NOT NULL,
  line2          VARCHAR(255),
  city           VARCHAR(100) NOT NULL,
  region         VARCHAR(100) NOT NULL,
  postal_code    VARCHAR(20),
  lat            DECIMAL(9,6),
  lng            DECIMAL(9,6),
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_addresses_user ON addresses (user_id);
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- =============================================================================
-- 2. MERCHANTS & SUBSCRIPTIONS
-- =============================================================================

-- ---- plans ------------------------------------------------------------------
CREATE TABLE plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           VARCHAR(50)  NOT NULL,
  name_ar        VARCHAR(100) NOT NULL,
  billing_period billing_period NOT NULL,
  price_sar      DECIMAL(10,2) NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  features       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plans_slug UNIQUE (slug),
  CONSTRAINT chk_plans_price CHECK (price_sar >= 0)
);
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- merchant_applications --------------------------------------------------
CREATE TABLE merchant_applications (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL,
  status                      application_status NOT NULL DEFAULT 'pending',
  commercial_name             VARCHAR(150) NOT NULL,
  commercial_registration_no  VARCHAR(50)  NOT NULL,
  vat_number                  VARCHAR(50),
  iban                        VARCHAR(34)  NOT NULL,
  notes                       TEXT,
  reviewed_by                 UUID,
  reviewed_at                 TIMESTAMPTZ,
  rejection_reason            TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ,
  CONSTRAINT fk_applications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_applications_user ON merchant_applications (user_id);
CREATE INDEX idx_applications_status ON merchant_applications (status);
CREATE INDEX idx_applications_deleted_at ON merchant_applications (deleted_at);
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON merchant_applications
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- merchants --------------------------------------------------------------
CREATE TABLE merchants (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL,
  status                      merchant_status NOT NULL DEFAULT 'active',
  commercial_name             VARCHAR(150) NOT NULL,
  commercial_registration_no  VARCHAR(50)  NOT NULL,
  vat_number                  VARCHAR(50),
  iban                        VARCHAR(34)  NOT NULL,
  commission_rate             DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  rating_avg                  DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count                INTEGER      NOT NULL DEFAULT 0,
  approved_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ,
  CONSTRAINT uq_merchants_user UNIQUE (user_id),
  CONSTRAINT uq_merchants_cr  UNIQUE (commercial_registration_no),
  CONSTRAINT uq_merchants_vat UNIQUE (vat_number),
  CONSTRAINT chk_merchants_commission CHECK (commission_rate >= 0 AND commission_rate <= 1),
  CONSTRAINT chk_merchants_rating    CHECK (rating_avg >= 0 AND rating_avg <= 5),
  CONSTRAINT fk_merchants_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);
CREATE INDEX idx_merchants_status ON merchants (status);
CREATE INDEX idx_merchants_deleted_at ON merchants (deleted_at);
CREATE TRIGGER trg_merchants_updated_at BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- merchant_employees -----------------------------------------------------
CREATE TABLE merchant_employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  user_id     UUID NOT NULL,
  role        merchant_emp_role NOT NULL,
  permissions JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT fk_merchant_employees_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_employees_user     FOREIGN KEY (user_id)     REFERENCES users (id)     ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_merchant_employees ON merchant_employees (merchant_id, user_id);
CREATE INDEX idx_merchant_employees_user ON merchant_employees (user_id);
CREATE INDEX idx_merchant_employees_deleted_at ON merchant_employees (deleted_at);
CREATE TRIGGER trg_merchant_employees_updated_at BEFORE UPDATE ON merchant_employees
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- merchant_subscriptions -------------------------------------------------
CREATE TABLE merchant_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         UUID NOT NULL,
  plan_id             UUID NOT NULL,
  status              subscription_status NOT NULL DEFAULT 'active',
  started_at          TIMESTAMPTZ NOT NULL,
  current_period_end  TIMESTAMPTZ NOT NULL,
  external_reference  VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_ref UNIQUE (external_reference),
  CONSTRAINT fk_subscriptions_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan     FOREIGN KEY (plan_id)     REFERENCES plans (id)     ON DELETE RESTRICT
);
CREATE INDEX idx_subscriptions_merchant ON merchant_subscriptions (merchant_id);
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON merchant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- =============================================================================
-- 3. ADMIN STAFF
-- =============================================================================

-- ---- admin_employees --------------------------------------------------------
CREATE TABLE admin_employees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  department admin_department NOT NULL,
  role       admin_role       NOT NULL DEFAULT 'admin_staff',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_admin_user UNIQUE (user_id),
  CONSTRAINT fk_admin_employees_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_admin_employees_deleted_at ON admin_employees (deleted_at);
CREATE TRIGGER trg_admin_employees_updated_at BEFORE UPDATE ON admin_employees
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- =============================================================================
-- 4. CATALOG
-- =============================================================================

-- ---- categories (self-nested) ----------------------------------------------
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID,
  slug       VARCHAR(100) NOT NULL,
  name_ar    VARCHAR(100) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_categories_slug UNIQUE (slug),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
);
CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- products ---------------------------------------------------------------
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    UUID,
  sku            VARCHAR(50)  NOT NULL,
  slug           VARCHAR(150) NOT NULL,
  name_ar        VARCHAR(200) NOT NULL,
  description_ar TEXT,
  price_sar      DECIMAL(10,2) NOT NULL,
  vat_rate       DECIMAL(5,4)  NOT NULL DEFAULT 0.15,
  status         catalog_status NOT NULL DEFAULT 'draft',
  weight_grams   INTEGER,
  is_package     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT uq_products_sku  UNIQUE (sku),
  CONSTRAINT uq_products_slug UNIQUE (slug),
  CONSTRAINT chk_products_price  CHECK (price_sar >= 0),
  CONSTRAINT chk_products_vat    CHECK (vat_rate >= 0 AND vat_rate <= 1),
  CONSTRAINT chk_products_weight CHECK (weight_grams IS NULL OR weight_grams >= 0),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_status   ON products (status);
CREATE INDEX idx_products_deleted_at ON products (deleted_at);
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- product_images ---------------------------------------------------------
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL,
  url         VARCHAR(1024) NOT NULL,
  alt_text_ar VARCHAR(200),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
CREATE INDEX idx_images_product ON product_images (product_id);
-- At most one primary image per product.
CREATE UNIQUE INDEX uq_product_images_primary ON product_images (product_id) WHERE is_primary = TRUE;
CREATE TRIGGER trg_product_images_updated_at BEFORE UPDATE ON product_images
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- packages ---------------------------------------------------------------
CREATE TABLE packages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku            VARCHAR(50)  NOT NULL,
  slug           VARCHAR(150) NOT NULL,
  name_ar        VARCHAR(200) NOT NULL,
  description_ar TEXT,
  price_sar      DECIMAL(10,2) NOT NULL,
  vat_rate       DECIMAL(5,4)  NOT NULL DEFAULT 0.15,
  status         catalog_status NOT NULL DEFAULT 'draft',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT uq_packages_sku  UNIQUE (sku),
  CONSTRAINT uq_packages_slug UNIQUE (slug),
  CONSTRAINT chk_packages_price CHECK (price_sar >= 0),
  CONSTRAINT chk_packages_vat   CHECK (vat_rate >= 0 AND vat_rate <= 1)
);
CREATE INDEX idx_packages_status     ON packages (status);
CREATE INDEX idx_packages_deleted_at ON packages (deleted_at);
CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- package_items (join with quantity) ------------------------------------
CREATE TABLE package_items (
  package_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (package_id, product_id),
  CONSTRAINT chk_package_items_qty CHECK (quantity >= 1),
  CONSTRAINT fk_package_items_package FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE,
  CONSTRAINT fk_package_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
);
CREATE TRIGGER trg_package_items_updated_at BEFORE UPDATE ON package_items
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- merchant_products (allowed sellables per merchant) --------------------
CREATE TABLE merchant_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  product_id  UUID,
  package_id  UUID,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Exactly one of product_id / package_id must be set (XOR).
  CONSTRAINT chk_merchant_products_sellable CHECK ((product_id IS NULL) <> (package_id IS NULL)),
  CONSTRAINT fk_mp_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_product  FOREIGN KEY (product_id)  REFERENCES products (id)  ON DELETE CASCADE,
  CONSTRAINT fk_mp_package  FOREIGN KEY (package_id)  REFERENCES packages (id)  ON DELETE CASCADE
);
-- Partial unique indexes: a merchant cannot list the same product/package twice.
CREATE UNIQUE INDEX uq_mp_product  ON merchant_products (merchant_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX uq_mp_package  ON merchant_products (merchant_id, package_id) WHERE package_id IS NOT NULL;
CREATE INDEX idx_mp_merchant ON merchant_products (merchant_id);
CREATE TRIGGER trg_merchant_products_updated_at BEFORE UPDATE ON merchant_products
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- =============================================================================
-- 5. INVENTORY (central warehouse, single Subh depot in v1)
-- =============================================================================

-- ---- inventory --------------------------------------------------------------
-- NOTE: sellable_id intentionally has NO hard FK because it is polymorphic
-- (points to products.id OR packages.id, discriminated by sellable_type).
-- Integrity is enforced in the application layer / via triggers if desired.
CREATE TABLE inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sellable_type     sellable_type NOT NULL,
  sellable_id       UUID NOT NULL,
  sku               VARCHAR(50) NOT NULL,
  on_hand           INTEGER NOT NULL DEFAULT 0,
  reserved          INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 5,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_inventory_on_hand  CHECK (on_hand >= 0),
  CONSTRAINT chk_inventory_reserved CHECK (reserved >= 0 AND reserved <= on_hand),
  CONSTRAINT chk_inventory_reorder  CHECK (reorder_threshold >= 0)
);
CREATE UNIQUE INDEX uq_inventory_sellable ON inventory (sellable_type, sellable_id);
CREATE INDEX idx_inventory_sku ON inventory (sku);
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- stock_reservations -----------------------------------------------------
CREATE TABLE stock_reservations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id  UUID NOT NULL,
  cart_id       UUID,
  order_id      UUID,
  quantity      INTEGER NOT NULL,
  status        reservation_status NOT NULL DEFAULT 'active',
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_reservations_qty CHECK (quantity >= 1),
  CONSTRAINT fk_reservations_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE
);
CREATE INDEX idx_reservations_inventory ON stock_reservations (inventory_id);
CREATE INDEX idx_reservations_expires   ON stock_reservations (expires_at);
-- Sweep active reservations efficiently:
CREATE INDEX idx_reservations_active ON stock_reservations (status, expires_at) WHERE status = 'active';
CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON stock_reservations
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- stock_movements (immutable ledger) ------------------------------------
CREATE TABLE stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id   UUID NOT NULL,
  type           stock_movement_type NOT NULL,
  delta          INTEGER NOT NULL,
  reason         VARCHAR(255),
  reference_type VARCHAR(50),
  reference_id   UUID,
  actor_id       UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_movements_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE RESTRICT
);
CREATE INDEX idx_movements_inventory ON stock_movements (inventory_id);
CREATE INDEX idx_movements_created   ON stock_movements (created_at);

-- =============================================================================
-- 6. CART & CHECKOUT
-- =============================================================================

-- ---- carts ------------------------------------------------------------------
CREATE TABLE carts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  session_id VARCHAR(100),
  currency   VARCHAR(3) NOT NULL DEFAULT 'SAR',
  status     cart_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_carts_user    UNIQUE (user_id),
  CONSTRAINT uq_carts_session UNIQUE (session_id),
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- cart_items -------------------------------------------------------------
CREATE TABLE cart_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id        UUID NOT NULL,
  merchant_id    UUID NOT NULL,
  product_id     UUID,
  package_id     UUID,
  quantity       INTEGER NOT NULL,
  unit_price_sar DECIMAL(10,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_cart_items_qty     CHECK (quantity >= 1),
  CONSTRAINT chk_cart_items_price   CHECK (unit_price_sar >= 0),
  CONSTRAINT chk_cart_items_sellable CHECK ((product_id IS NULL) <> (package_id IS NULL)),
  CONSTRAINT fk_cart_items_cart     FOREIGN KEY (cart_id)     REFERENCES carts (id)     ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cart_items_product  FOREIGN KEY (product_id)  REFERENCES products (id)  ON DELETE RESTRICT,
  CONSTRAINT fk_cart_items_package  FOREIGN KEY (package_id)  REFERENCES packages (id)  ON DELETE RESTRICT
);
CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- =============================================================================
-- 7. ORDERS
-- =============================================================================

-- ---- orders -----------------------------------------------------------------
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number              VARCHAR(20) NOT NULL,
  user_id             UUID NOT NULL,
  merchant_id         UUID NOT NULL,
  parent_order_id     UUID,
  shipping_address_id UUID NOT NULL,
  status              order_status NOT NULL DEFAULT 'pending_payment',
  currency            VARCHAR(3) NOT NULL DEFAULT 'SAR',
  subtotal_sar        DECIMAL(10,2) NOT NULL,
  discount_sar        DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_sar        DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_sar             DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_sar           DECIMAL(10,2) NOT NULL,
  notes_ar            TEXT,
  placed_at           TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_orders_number UNIQUE (number),
  CONSTRAINT chk_orders_subtotal CHECK (subtotal_sar >= 0),
  CONSTRAINT chk_orders_discount CHECK (discount_sar >= 0),
  CONSTRAINT chk_orders_shipping CHECK (shipping_sar >= 0),
  CONSTRAINT chk_orders_vat      CHECK (vat_sar >= 0),
  CONSTRAINT chk_orders_total    CHECK (total_sar >= 0),
  CONSTRAINT chk_orders_consistency CHECK (total_sar = subtotal_sar - discount_sar + shipping_sar + vat_sar),
  CONSTRAINT fk_orders_user     FOREIGN KEY (user_id)             REFERENCES users (id)      ON DELETE RESTRICT,
  CONSTRAINT fk_orders_merchant FOREIGN KEY (merchant_id)         REFERENCES merchants (id)  ON DELETE RESTRICT,
  CONSTRAINT fk_orders_address  FOREIGN KEY (shipping_address_id) REFERENCES addresses (id)  ON DELETE RESTRICT,
  CONSTRAINT fk_orders_parent   FOREIGN KEY (parent_order_id)     REFERENCES orders (id)     ON DELETE SET NULL
);
CREATE INDEX idx_orders_user     ON orders (user_id);
CREATE INDEX idx_orders_merchant ON orders (merchant_id);
CREATE INDEX idx_orders_status   ON orders (status);
CREATE INDEX idx_orders_placed   ON orders (placed_at);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- order_items ------------------------------------------------------------
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL,
  merchant_id     UUID NOT NULL,
  product_id      UUID,
  package_id      UUID,
  name_snapshot_ar VARCHAR(200) NOT NULL,
  sku_snapshot    VARCHAR(50)  NOT NULL,
  quantity        INTEGER NOT NULL,
  unit_price_sar  DECIMAL(10,2) NOT NULL,
  vat_rate        DECIMAL(5,4)   NOT NULL DEFAULT 0.15,
  line_total_sar  DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_order_items_qty     CHECK (quantity >= 1),
  CONSTRAINT chk_order_items_price   CHECK (unit_price_sar >= 0),
  CONSTRAINT chk_order_items_total   CHECK (line_total_sar >= 0),
  CONSTRAINT chk_order_items_vat     CHECK (vat_rate >= 0 AND vat_rate <= 1),
  CONSTRAINT chk_order_items_sellable CHECK ((product_id IS NULL) <> (package_id IS NULL)),
  CONSTRAINT fk_order_items_order    FOREIGN KEY (order_id)    REFERENCES orders (id)    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_product  FOREIGN KEY (product_id)  REFERENCES products (id)  ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_package  FOREIGN KEY (package_id)  REFERENCES packages (id)  ON DELETE RESTRICT
);
CREATE INDEX idx_order_items_order    ON order_items (order_id);
CREATE INDEX idx_order_items_merchant ON order_items (merchant_id);
CREATE TRIGGER trg_order_items_updated_at BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- order_status_history (append-only timeline) --------------------------
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL,
  from_status VARCHAR(30),
  to_status   VARCHAR(30) NOT NULL,
  comment_ar  TEXT,
  actor_id    UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_status_history_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);
CREATE INDEX idx_status_history_order ON order_status_history (order_id);

-- =============================================================================
-- 8. FULFILMENT & PAYMENTS
-- =============================================================================

-- ---- shipments --------------------------------------------------------------
CREATE TABLE shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL,
  carrier         VARCHAR(100),
  tracking_number VARCHAR(100),
  status          shipment_status NOT NULL DEFAULT 'pending',
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_shipments_order UNIQUE (order_id),
  CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- payments ---------------------------------------------------------------
-- provider_reference is UNIQUE so a repeated payment webhook is a no-op,
-- satisfying: "إشعار الدفع المتكرر يجب ألا ينشئ طلبًا أو خصمًا مكررًا".
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL,
  provider         VARCHAR(50) NOT NULL,
  provider_reference VARCHAR(150),
  method           payment_method NOT NULL,
  amount_sar       DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(3) NOT NULL DEFAULT 'SAR',
  status           payment_status NOT NULL DEFAULT 'initiated',
  captured_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT uq_payments_ref UNIQUE (provider_reference),
  CONSTRAINT chk_payments_amount CHECK (amount_sar >= 0),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT
);
CREATE INDEX idx_payments_order      ON payments (order_id);
CREATE INDEX idx_payments_status     ON payments (status);
CREATE INDEX idx_payments_deleted_at ON payments (deleted_at);
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- payment_events (raw gateway events, idempotent by event_id) ----------
CREATE TABLE payment_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  event_id   VARCHAR(150) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  status     VARCHAR(50)  NOT NULL,
  payload    JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_events_id UNIQUE (event_id),
  CONSTRAINT fk_payment_events_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE
);
CREATE INDEX idx_payment_events_payment ON payment_events (payment_id);
CREATE TRIGGER trg_payment_events_updated_at BEFORE UPDATE ON payment_events
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- refunds ---------------------------------------------------------------
CREATE TABLE refunds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       UUID NOT NULL,
  order_id         UUID NOT NULL,
  amount_sar       DECIMAL(10,2) NOT NULL,
  reason_ar        VARCHAR(255),
  status           refund_status NOT NULL DEFAULT 'pending',
  provider_reference VARCHAR(150),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_refunds_ref UNIQUE (provider_reference),
  CONSTRAINT chk_refunds_amount CHECK (amount_sar >= 0),
  CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_refunds_order   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE RESTRICT
);
CREATE INDEX idx_refunds_payment ON refunds (payment_id);
CREATE INDEX idx_refunds_order   ON refunds (order_id);
CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- invoices --------------------------------------------------------------
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL,
  number          VARCHAR(30) NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL,
  buyer_name      VARCHAR(150) NOT NULL,
  buyer_vat_number VARCHAR(50),
  subtotal_sar    DECIMAL(10,2) NOT NULL,
  vat_sar         DECIMAL(10,2) NOT NULL,
  total_sar       DECIMAL(10,2) NOT NULL,
  pdf_url         VARCHAR(1024),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoices_order   UNIQUE (order_id),
  CONSTRAINT uq_invoices_number  UNIQUE (number),
  CONSTRAINT chk_invoices_total  CHECK (total_sar = subtotal_sar + vat_sar),
  CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT
);
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- =============================================================================
-- 9. PLATFORM (notifications, audit logs)
-- =============================================================================

-- ---- notifications ---------------------------------------------------------
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  channel    notification_channel NOT NULL DEFAULT 'in_app',
  title_ar   VARCHAR(150) NOT NULL,
  body_ar    TEXT NOT NULL,
  payload    JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user   ON notifications (user_id);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION subh_set_updated_at();

-- ---- audit_logs (append-only: no updated_at) ------------------------------
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  actor_type  VARCHAR(30),
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  before      JSONB,
  after       JSONB,
  ip_address  INET,
  user_agent  VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_actor   ON audit_logs (actor_id);
CREATE INDEX idx_audit_action  ON audit_logs (action);
CREATE INDEX idx_audit_created ON audit_logs (created_at);
-- Optional FK to users is intentionally omitted: audit rows must survive
-- user deletion so the trail remains complete.

-- =============================================================================
-- END OF SCHEMA — 33 tables, 19 enum types, full constraint set.
-- =============================================================================
