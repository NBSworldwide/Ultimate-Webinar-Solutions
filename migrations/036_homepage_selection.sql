ALTER TABLE content_pages
  ADD COLUMN IF NOT EXISTS is_homepage BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE content_pages
SET is_homepage = TRUE
WHERE slug = 'home' AND status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_pages_single_homepage
  ON content_pages (is_homepage)
  WHERE is_homepage = TRUE;
