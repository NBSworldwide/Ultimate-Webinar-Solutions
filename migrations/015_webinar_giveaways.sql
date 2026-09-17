ALTER TABLE webinars
  ADD COLUMN IF NOT EXISTS giveaway_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prize_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prize_product_name TEXT,
  ADD COLUMN IF NOT EXISTS prize_product_sku TEXT,
  ADD COLUMN IF NOT EXISTS prize_product_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS claim_deadline TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_notes TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_webinars_giveaway ON webinars(giveaway_enabled, status);
