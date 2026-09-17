CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  display_name TEXT NOT NULL DEFAULT 'Webinar Studio',
  legal_name TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT 'A focused workspace for running memorable live webinars.',
  description TEXT NOT NULL DEFAULT 'A standalone workspace for planning, publishing, and operating live webinar sessions.',
  logo_url TEXT NOT NULL DEFAULT '',
  logo_alt TEXT NOT NULL DEFAULT '',
  primary_email TEXT NOT NULL DEFAULT '',
  support_email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'US',
  website_url TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  currency TEXT NOT NULL DEFAULT 'USD',
  support_url TEXT NOT NULL DEFAULT '',
  privacy_url TEXT NOT NULL DEFAULT '',
  terms_url TEXT NOT NULL DEFAULT '',
  shipping_policy_url TEXT NOT NULL DEFAULT '',
  business_hours TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  facebook_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO site_settings (id, updated_at)
VALUES ('default', NOW()::text)
ON CONFLICT (id) DO NOTHING;
