ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS appearance_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  content_width INTEGER NOT NULL DEFAULT 1180 CHECK (content_width BETWEEN 960 AND 1600),
  container_padding INTEGER NOT NULL DEFAULT 20 CHECK (container_padding BETWEEN 0 AND 160),
  column_gap INTEGER NOT NULL DEFAULT 20 CHECK (column_gap BETWEEN 0 AND 300),
  row_gap INTEGER NOT NULL DEFAULT 20 CHECK (row_gap BETWEEN 0 AND 300),
  page_title_selector TEXT NOT NULL DEFAULT 'h1',
  stretch_sections BOOLEAN NOT NULL DEFAULT TRUE,
  default_page_layout TEXT NOT NULL DEFAULT 'full_width' CHECK (default_page_layout IN ('full_width', 'boxed')),
  breakpoints_json TEXT NOT NULL DEFAULT '{"widescreen":1600,"desktop":1200,"laptop":1024,"tablet":768,"mobile":480}',
  custom_css TEXT NOT NULL DEFAULT '',
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO appearance_settings (id, updated_at)
VALUES ('default', NOW()::text)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS global_color_tokens (
  id TEXT PRIMARY KEY,
  token_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_color_tokens_order ON global_color_tokens(is_system DESC, sort_order, name);

INSERT INTO global_color_tokens (id, token_key, name, value, is_system, sort_order, created_at, updated_at)
VALUES
  ('color-primary', 'color-primary', 'Primary', '#0f776e', TRUE, 0, NOW()::text, NOW()::text),
  ('color-accent', 'color-accent', 'Accent', '#e56d54', TRUE, 1, NOW()::text, NOW()::text),
  ('color-surface', 'color-surface', 'Page background', '#f7f8f5', TRUE, 2, NOW()::text, NOW()::text),
  ('color-surface-raised', 'color-surface-raised', 'Card background', '#ffffff', TRUE, 3, NOW()::text, NOW()::text),
  ('color-ink', 'color-ink', 'Main text', '#17211f', TRUE, 4, NOW()::text, NOW()::text),
  ('color-ink-soft', 'color-ink-soft', 'Secondary text', '#52615e', TRUE, 5, NOW()::text, NOW()::text),
  ('color-ink-faint', 'color-ink-faint', 'Quiet text', '#60706b', TRUE, 6, NOW()::text, NOW()::text),
  ('color-line', 'color-line', 'Borders', '#dfe7e2', TRUE, 7, NOW()::text, NOW()::text),
  ('color-success', 'color-success', 'Success', '#2d9d78', TRUE, 8, NOW()::text, NOW()::text),
  ('color-warning', 'color-warning', 'Warning', '#ae7d2c', TRUE, 9, NOW()::text, NOW()::text),
  ('color-danger', 'color-danger', 'Danger', '#c85740', TRUE, 10, NOW()::text, NOW()::text)
ON CONFLICT (token_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS global_typography_tokens (
  id TEXT PRIMARY KEY,
  token_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  font_family TEXT NOT NULL DEFAULT 'DM Sans',
  font_weight INTEGER NOT NULL DEFAULT 400 CHECK (font_weight BETWEEN 100 AND 900),
  font_size REAL NOT NULL DEFAULT 16 CHECK (font_size BETWEEN 6 AND 160),
  line_height REAL NOT NULL DEFAULT 1.5 CHECK (line_height BETWEEN 0.5 AND 4),
  letter_spacing REAL NOT NULL DEFAULT 0 CHECK (letter_spacing BETWEEN -20 AND 40),
  text_transform TEXT NOT NULL DEFAULT 'none' CHECK (text_transform IN ('none', 'uppercase', 'lowercase', 'capitalize')),
  font_style TEXT NOT NULL DEFAULT 'normal' CHECK (font_style IN ('normal', 'italic', 'oblique')),
  responsive_json TEXT NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_typography_tokens_order ON global_typography_tokens(is_system DESC, sort_order, name);

INSERT INTO global_typography_tokens
  (id, token_key, name, font_family, font_weight, font_size, line_height, letter_spacing, text_transform, font_style, responsive_json, is_system, sort_order, created_at, updated_at)
VALUES
  ('type-heading', 'type-heading', 'Heading', 'Manrope', 800, 42, 1.05, -1.2, 'none', 'normal', '{"tablet":{"fontSize":34},"mobile":{"fontSize":30}}', TRUE, 0, NOW()::text, NOW()::text),
  ('type-body', 'type-body', 'Body', 'DM Sans', 400, 16, 1.55, 0, 'none', 'normal', '{"mobile":{"fontSize":15}}', TRUE, 1, NOW()::text, NOW()::text),
  ('type-label', 'type-label', 'Label', 'DM Mono', 500, 11, 1.3, 1.1, 'uppercase', 'normal', '{}', TRUE, 2, NOW()::text, NOW()::text),
  ('type-caption', 'type-caption', 'Caption', 'DM Sans', 400, 12, 1.4, 0, 'none', 'normal', '{}', TRUE, 3, NOW()::text, NOW()::text),
  ('type-eyebrow', 'type-eyebrow', 'Eyebrow', 'DM Mono', 500, 10, 1.2, 1.4, 'uppercase', 'normal', '{}', TRUE, 4, NOW()::text, NOW()::text)
ON CONFLICT (token_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trashed')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_search ON media_assets(status, created_at, file_name);

CREATE TABLE IF NOT EXISTS form_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  submit_button_text TEXT NOT NULL DEFAULT 'Submit',
  submitting_text TEXT NOT NULL DEFAULT 'Sending…',
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_form_definitions_status_updated ON form_definitions(status, updated_at);

CREATE TABLE IF NOT EXISTS form_fields (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'name', 'email', 'range', 'captcha', 'consent', 'phone', 'datetime', 'address', 'map', 'url', 'layout', 'page_break', 'divider', 'rich_text', 'html', 'signature', 'hidden')),
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  placeholder TEXT NOT NULL DEFAULT '',
  field_id TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  options_json TEXT NOT NULL DEFAULT '[]',
  default_value TEXT NOT NULL DEFAULT '',
  validation_json TEXT NOT NULL DEFAULT '{}',
  conditional_json TEXT NOT NULL DEFAULT '{}',
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (form_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_form_fields_form_order ON form_fields(form_id, sort_order, id);

CREATE TABLE IF NOT EXISTS form_notifications (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  recipient_emails_json TEXT NOT NULL DEFAULT '[]',
  subject TEXT NOT NULL DEFAULT 'New form submission: {{form_name}}',
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  reply_to TEXT NOT NULL DEFAULT '',
  message_html TEXT NOT NULL DEFAULT '<p>A new submission was received.</p>',
  condition_json TEXT NOT NULL DEFAULT '{}',
  advanced_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_notifications_form_order ON form_notifications(form_id, sort_order, id);

CREATE TABLE IF NOT EXISTS form_confirmations (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
  confirmation_type TEXT NOT NULL DEFAULT 'message' CHECK (confirmation_type IN ('message', 'page', 'url')),
  message_html TEXT NOT NULL DEFAULT '<p>Thanks — your response has been received.</p>',
  page_url TEXT NOT NULL DEFAULT '',
  redirect_url TEXT NOT NULL DEFAULT '',
  auto_scroll BOOLEAN NOT NULL DEFAULT TRUE,
  entry_preview BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_form_confirmations_one_per_form ON form_confirmations(form_id);

CREATE TABLE IF NOT EXISTS form_mailer_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  primary_provider TEXT NOT NULL DEFAULT 'native' CHECK (primary_provider IN ('native', 'smtp', 'brevo', 'mailjet', 'sendgrid', 'gmail', 'resend', 'mailgun', 'ses', 'postmark')),
  backup_provider TEXT CHECK (backup_provider IS NULL OR backup_provider IN ('native', 'smtp', 'brevo', 'mailjet', 'sendgrid', 'gmail', 'resend', 'mailgun', 'ses', 'postmark')),
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  force_from BOOLEAN NOT NULL DEFAULT FALSE,
  settings_json TEXT NOT NULL DEFAULT '{}',
  last_tested_at TEXT,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE form_mailer_settings ADD COLUMN IF NOT EXISTS secrets_ciphertext TEXT NOT NULL DEFAULT '';

INSERT INTO form_mailer_settings (id, updated_at)
VALUES ('default', NOW()::text)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS form_entries (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES form_definitions(id) ON DELETE RESTRICT,
  entry_number INTEGER NOT NULL CHECK (entry_number > 0),
  values_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  is_spam BOOLEAN NOT NULL DEFAULT FALSE,
  trashed_at TEXT,
  payment_status TEXT NOT NULL DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'paid', 'refunded')),
  ip_address TEXT,
  ip_hash TEXT,
  country TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (form_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_form_entries_form_created ON form_entries(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_entries_form_flags ON form_entries(form_id, is_read, is_starred, is_spam, trashed_at);
CREATE INDEX IF NOT EXISTS idx_form_entries_ip_hash ON form_entries(ip_hash);

CREATE TABLE IF NOT EXISTS form_entry_audit (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES form_entries(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_entry_audit_entry_created ON form_entry_audit(entry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS form_entry_delivery (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES form_entries(id) ON DELETE CASCADE,
  notification_id TEXT REFERENCES form_notifications(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'local',
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  attempted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_entry_delivery_entry_created ON form_entry_delivery(entry_id, created_at DESC);
