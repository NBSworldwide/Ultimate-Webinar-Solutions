-- Align the untouched initial appearance preset with the builder's 20px
-- container padding and child gaps. Deliberately preserve any customized
-- appearance values instead of overwriting a site's intentional settings.
UPDATE appearance_settings
SET container_padding = 20,
    column_gap = 20,
    row_gap = 20,
    updated_at = NOW()::text
WHERE id = 'default'
  AND container_padding = 24
  AND column_gap = 24
  AND row_gap = 24;
