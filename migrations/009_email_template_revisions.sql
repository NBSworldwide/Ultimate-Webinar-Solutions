CREATE TABLE IF NOT EXISTS email_template_revisions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  subject TEXT NOT NULL,
  preheader TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  edited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE (template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_email_template_revisions_template
  ON email_template_revisions(template_id, version DESC);
