ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

DO $$
DECLARE
  account RECORD;
  base_username TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR account IN SELECT id, email FROM users WHERE username IS NULL ORDER BY id LOOP
    base_username := lower(regexp_replace(split_part(account.email, '@', 1), '[^a-z0-9]+', '-', 'g'));
    base_username := trim(both '-' FROM base_username);
    IF length(base_username) < 3 THEN
      base_username := 'user';
    END IF;
    base_username := left(base_username, 32);
    candidate := base_username;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM users WHERE lower(username) = lower(candidate)) LOOP
      suffix := suffix + 1;
      candidate := left(base_username, 31 - length(suffix::TEXT)) || '-' || suffix::TEXT;
    END LOOP;
    UPDATE users SET username = candidate WHERE id = account.id;
  END LOOP;
END $$;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_format_check;
ALTER TABLE users
  ADD CONSTRAINT users_username_format_check
  CHECK (username ~ '^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
