CREATE TABLE IF NOT EXISTS integration_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  streaming_provider TEXT CHECK (streaming_provider IN ('cloudflare_stream', 'mux', 'amazon_ivs')),
  email_provider TEXT CHECK (email_provider IN ('resend', 'postmark', 'sendgrid')),
  streaming_config_ciphertext TEXT NOT NULL DEFAULT '',
  email_config_ciphertext TEXT NOT NULL DEFAULT '',
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO integration_settings (id, updated_at)
VALUES ('default', NOW()::text)
ON CONFLICT (id) DO NOTHING;
