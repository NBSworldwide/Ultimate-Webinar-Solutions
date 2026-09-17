CREATE TABLE IF NOT EXISTS theme_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  preset TEXT NOT NULL DEFAULT 'studio',
  body_style TEXT NOT NULL DEFAULT 'fullwide',
  content_width INTEGER NOT NULL DEFAULT 1180 CHECK (content_width BETWEEN 960 AND 1440),
  section_spacing TEXT NOT NULL DEFAULT 'medium',
  shop_layout TEXT NOT NULL DEFAULT 'grid',
  heading_font TEXT NOT NULL DEFAULT 'manrope',
  body_font TEXT NOT NULL DEFAULT 'dm-sans',
  primary_color TEXT NOT NULL DEFAULT '#0f776e',
  accent_color TEXT NOT NULL DEFAULT '#e56d54',
  surface_color TEXT NOT NULL DEFAULT '#f7f8f5',
  surface_raised_color TEXT NOT NULL DEFAULT '#ffffff',
  ink_color TEXT NOT NULL DEFAULT '#17211f',
  ink_soft_color TEXT NOT NULL DEFAULT '#52615e',
  ink_faint_color TEXT NOT NULL DEFAULT '#60706b',
  line_color TEXT NOT NULL DEFAULT '#dfe7e2',
  card_radius INTEGER NOT NULL DEFAULT 18 CHECK (card_radius BETWEEN 0 AND 32),
  button_radius INTEGER NOT NULL DEFAULT 10 CHECK (button_radius BETWEEN 0 AND 32),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO theme_settings (id, updated_at)
VALUES ('default', NOW()::text)
ON CONFLICT (id) DO NOTHING;
