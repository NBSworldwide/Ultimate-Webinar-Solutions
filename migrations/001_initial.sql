CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'attendee')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webinars (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  eyebrow TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  timezone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'sold_out', 'completed')),
  provider TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_bio TEXT NOT NULL,
  replay_label TEXT NOT NULL,
  replay_url TEXT,
  accent TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tiers (
  id TEXT PRIMARY KEY,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS seats (
  id TEXT PRIMARY KEY,
  tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL CHECK (seat_number > 0),
  status TEXT NOT NULL CHECK (status IN ('available', 'held', 'sold')),
  hold_token_hash TEXT,
  hold_expires_at TEXT,
  registration_id TEXT,
  UNIQUE (tier_id, seat_number)
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  registration_group_id TEXT NOT NULL,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE RESTRICT,
  tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE RESTRICT,
  seat_id TEXT NOT NULL UNIQUE REFERENCES seats(id) ON DELETE RESTRICT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notification_consent BOOLEAN NOT NULL DEFAULT FALSE,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  access_status TEXT NOT NULL CHECK (access_status IN ('active', 'removed')),
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  registration_id TEXT REFERENCES registrations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  template_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS winner_draws (
  id TEXT PRIMARY KEY,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  candidate_count INTEGER NOT NULL,
  selection_method TEXT NOT NULL,
  drawn_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE (webinar_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webinars_status_start ON webinars(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_seats_status_expiry ON seats(status, hold_expires_at);
CREATE INDEX IF NOT EXISTS idx_registrations_webinar ON registrations(webinar_id, created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expiry ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_created ON audit_events(entity_type, entity_id, created_at);
