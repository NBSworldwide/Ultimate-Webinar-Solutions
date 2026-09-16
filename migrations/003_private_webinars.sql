ALTER TABLE webinars
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'webinars_visibility_check'
  ) THEN
    ALTER TABLE webinars
      ADD CONSTRAINT webinars_visibility_check CHECK (visibility IN ('public', 'private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_webinars_visibility_status_start
  ON webinars(visibility, status, starts_at);

CREATE TABLE IF NOT EXISTS webinar_invites (
  id TEXT PRIMARY KEY,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_verified_at TEXT,
  redeemed_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE (webinar_id, email)
);

CREATE INDEX IF NOT EXISTS idx_webinar_invites_webinar_email
  ON webinar_invites(webinar_id, email);

CREATE INDEX IF NOT EXISTS idx_webinar_invites_expiry
  ON webinar_invites(expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS private_webinar_sessions (
  token_hash TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES webinar_invites(id) ON DELETE CASCADE,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_private_webinar_sessions_webinar_expiry
  ON private_webinar_sessions(webinar_id, expires_at);
