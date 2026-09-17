ALTER TABLE webinars
  ADD COLUMN IF NOT EXISTS prize_product_name TEXT,
  ADD COLUMN IF NOT EXISTS prize_product_sku TEXT,
  ADD COLUMN IF NOT EXISTS prize_product_price_cents INTEGER;
