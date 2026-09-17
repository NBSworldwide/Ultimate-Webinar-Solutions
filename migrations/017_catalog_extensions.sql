ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compare_at_price_cents INTEGER CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS sale_price_cents INTEGER CHECK (sale_price_cents IS NULL OR sale_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS sale_starts_at TEXT,
  ADD COLUMN IF NOT EXISTS sale_ends_at TEXT;

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  option_values_json TEXT NOT NULL DEFAULT '{}',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  compare_at_price_cents INTEGER CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents >= 0),
  sale_price_cents INTEGER CHECK (sale_price_cents IS NULL OR sale_price_cents >= 0),
  sale_starts_at TEXT,
  sale_ends_at TEXT,
  inventory_quantity INTEGER NOT NULL DEFAULT 0 CHECK (inventory_quantity >= 0),
  weight_grams INTEGER NOT NULL DEFAULT 0 CHECK (weight_grams >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_status ON product_variants(product_id, status, name);

CREATE TABLE IF NOT EXISTS product_relations (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related', 'recommended', 'frequently_bought_together')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (product_id, related_product_id, relation_type),
  CHECK (product_id <> related_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_relations_product ON product_relations(product_id, relation_type, sort_order);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value INTEGER NOT NULL CHECK (discount_value >= 0),
  minimum_order_cents INTEGER NOT NULL DEFAULT 0 CHECK (minimum_order_cents >= 0),
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_customer_limit INTEGER CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
  starts_at TEXT,
  ends_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'archived')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupon_product_rules (
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, product_id)
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_email TEXT NOT NULL,
  discount_cents INTEGER NOT NULL CHECK (discount_cents >= 0),
  created_at TEXT NOT NULL,
  UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupons_status_window ON coupons(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer ON coupon_redemptions(coupon_id, customer_email);

CREATE TABLE IF NOT EXISTS inventory_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('shopify', 'square', 'cin7', 'custom_api')),
  base_url TEXT NOT NULL DEFAULT '',
  config_ciphertext TEXT NOT NULL DEFAULT '',
  sync_mode TEXT NOT NULL DEFAULT 'hybrid' CHECK (sync_mode IN ('local', 'external', 'hybrid')),
  safety_stock INTEGER NOT NULL DEFAULT 0 CHECK (safety_stock >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')),
  last_synced_at TEXT,
  last_error TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_mappings (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES inventory_sources(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  external_sku TEXT NOT NULL,
  external_product_id TEXT,
  external_variant_id TEXT,
  external_available_quantity INTEGER,
  local_reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (local_reserved_quantity >= 0),
  updated_at TEXT NOT NULL,
  CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL),
  UNIQUE (source_id, external_sku)
);

CREATE TABLE IF NOT EXISTS inventory_sync_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES inventory_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  items_seen INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventory_mappings_product ON inventory_mappings(product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sync_runs_source ON inventory_sync_runs(source_id, started_at DESC);
