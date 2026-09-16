ALTER TABLE tiers
  ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'fixed_per_seat';

ALTER TABLE tiers
  ADD COLUMN IF NOT EXISTS reference_value_cents INTEGER;

ALTER TABLE tiers
  ADD COLUMN IF NOT EXISTS rounding_mode TEXT NOT NULL DEFAULT 'exact_cents';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tiers_pricing_model_check'
  ) THEN
    ALTER TABLE tiers
      ADD CONSTRAINT tiers_pricing_model_check CHECK (pricing_model IN ('fixed_per_seat', 'split_total_value'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tiers_reference_value_check'
  ) THEN
    ALTER TABLE tiers
      ADD CONSTRAINT tiers_reference_value_check CHECK (reference_value_cents IS NULL OR reference_value_cents >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tiers_rounding_mode_check'
  ) THEN
    ALTER TABLE tiers
      ADD CONSTRAINT tiers_rounding_mode_check CHECK (rounding_mode IN ('exact_cents', 'nearest_dollar', 'round_up_dollar'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tiers_pricing_model ON tiers(pricing_model);
