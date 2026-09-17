ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS sms_consent_at TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS sms_consent_source TEXT;

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS sms_opted_out_at TEXT;

-- Preserve the meaning of the old combined notification checkbox for existing
-- synthetic records while new registrations use the explicit SMS field.
UPDATE registrations
SET sms_consent = TRUE,
    sms_consent_at = COALESCE(sms_consent_at, created_at),
    sms_consent_source = COALESCE(sms_consent_source, 'legacy-notification-consent')
WHERE notification_consent = TRUE AND sms_consent = FALSE;

UPDATE crm_contacts c
SET sms_consent = TRUE
WHERE c.sms_consent = FALSE
  AND EXISTS (
    SELECT 1 FROM registrations r
    WHERE lower(r.customer_email) = lower(c.email)
      AND r.sms_consent = TRUE
  );

CREATE TABLE IF NOT EXISTS sms_templates (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  trigger_key TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('transactional', 'marketing')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_outbox (
  id TEXT PRIMARY KEY,
  trigger_key TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  template_id TEXT REFERENCES sms_templates(id) ON DELETE SET NULL,
  template_version INTEGER,
  message_body TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled', 'suppressed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT NOT NULL,
  provider_message_id TEXT,
  sent_at TEXT,
  last_error TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_delivery_events (
  id TEXT PRIMARY KEY,
  outbox_id TEXT NOT NULL REFERENCES sms_outbox(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  provider_status TEXT NOT NULL,
  provider_error_code TEXT,
  received_at TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sms_template_revisions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES sms_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  body TEXT NOT NULL,
  edited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE (template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_due
  ON sms_outbox(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_entity
  ON sms_outbox(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_delivery_events_outbox
  ON sms_delivery_events(outbox_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_template_revisions_template
  ON sms_template_revisions(template_id, version DESC);

INSERT INTO sms_templates
  (id, slug, name, trigger_key, message_type, body, status, version, created_at, updated_at)
VALUES
  ('sms-template-registration-confirmed', 'registration-confirmed', 'Registration confirmation', 'registration.created', 'transactional', 'NBS: Hi {{customer_name}}, your seat for {{session_title}} is confirmed. Details: {{session_access_link}} Reply STOP to opt out.', 'active', 1, NOW()::text, NOW()::text),
  ('sms-template-session-starting-soon', 'session-starting-soon', 'Session starting soon', 'session.starting_soon', 'transactional', 'NBS: {{session_title}} starts at {{session_start_time}}. Join here: {{session_access_link}} Reply STOP to opt out.', 'active', 1, NOW()::text, NOW()::text),
  ('sms-template-winner-selected', 'winner-selected', 'Winner selected', 'winner.drawn', 'transactional', 'NBS: Congratulations, {{winner_name}}! You won the drawing for {{session_title}}. Details: {{winner_link}} Reply STOP to opt out.', 'active', 1, NOW()::text, NOW()::text)
ON CONFLICT (slug) DO NOTHING;
