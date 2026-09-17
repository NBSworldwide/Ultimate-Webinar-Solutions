CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  lifecycle_stage TEXT NOT NULL DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'attendee', 'customer', 'inactive')),
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'teal',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_contact_tags (
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS crm_notes (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('registration', 'order', 'email', 'note', 'system')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  entity_type TEXT,
  entity_id TEXT,
  occurred_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage_updated
  ON crm_contacts(lifecycle_stage, updated_at);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_name_email
  ON crm_contacts(name, email);
CREATE INDEX IF NOT EXISTS idx_crm_contact_tags_contact
  ON crm_contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_contact_created
  ON crm_notes(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_occurred
  ON crm_activities(contact_id, occurred_at DESC);

INSERT INTO crm_tags (id, slug, name, color, created_at)
VALUES
  ('crm-tag-attendee', 'attendee', 'Attendee', 'teal', NOW()::text),
  ('crm-tag-customer', 'customer', 'Customer', 'coral', NOW()::text),
  ('crm-tag-lead', 'lead', 'Lead', 'gold', NOW()::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO crm_contacts (id, email, name, phone, source, lifecycle_stage, marketing_consent, created_at, updated_at)
SELECT
  'crm-contact-' || md5(lower(customer_email)),
  lower(customer_email),
  MAX(customer_name),
  MAX(customer_phone),
  'registration',
  'attendee',
  BOOL_OR(notification_consent),
  MIN(created_at),
  MAX(created_at)
FROM registrations
GROUP BY lower(customer_email)
ON CONFLICT (email) DO NOTHING;

INSERT INTO crm_contacts (id, email, name, phone, source, lifecycle_stage, marketing_consent, created_at, updated_at)
SELECT
  'crm-contact-' || md5(lower(customer_email)),
  lower(customer_email),
  MAX(customer_name),
  MAX(customer_phone),
  'order',
  'customer',
  FALSE,
  MIN(created_at),
  MAX(created_at)
FROM orders
GROUP BY lower(customer_email)
ON CONFLICT (email) DO NOTHING;

INSERT INTO crm_contact_tags (contact_id, tag_id, created_at)
SELECT c.id, t.id, NOW()::text
FROM crm_contacts c
JOIN crm_tags t ON t.slug = CASE WHEN c.lifecycle_stage = 'customer' THEN 'customer' ELSE 'attendee' END
ON CONFLICT (contact_id, tag_id) DO NOTHING;
