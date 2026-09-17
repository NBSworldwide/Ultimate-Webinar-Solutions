ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id TEXT REFERENCES product_variants(id) ON DELETE RESTRICT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
