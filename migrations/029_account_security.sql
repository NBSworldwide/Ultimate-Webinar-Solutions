ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line1 TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line2 TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS password_change_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_change_requests_user_pending
  ON password_change_requests(user_id, consumed_at, expires_at);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('account_recovery', 'admin_reset')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_pending
  ON password_reset_requests(user_id, consumed_at, expires_at);

CREATE TABLE IF NOT EXISTS email_change_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  old_token_hash TEXT NOT NULL UNIQUE,
  new_token_hash TEXT NOT NULL UNIQUE,
  old_verified_at TEXT,
  new_verified_at TEXT,
  expires_at TEXT NOT NULL,
  cancelled_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_change_requests_user_pending
  ON email_change_requests(user_id, cancelled_at, completed_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_new_email
  ON email_change_requests(lower(new_email));

INSERT INTO email_templates
  (id, slug, name, trigger_key, message_type, subject, preheader, html_body, text_body, status, created_at, updated_at)
VALUES
  ('email-template-password-change-authorization', 'password-change-authorization', 'Password change authorization', 'account.password_change_requested', 'transactional',
   'Authorize your password change', 'Your password will not change until you approve this request.',
   '<h1>Authorize your password change</h1><p>Hi {{customer_name}}, a password change was requested for your account.</p><p>Your password will not change until you open the authorization link below. This link expires {{authorization_expires}}.</p><p><a href="{{authorization_link}}">Authorize password change</a></p><p>If you did not request this, you can ignore this message and your password will remain unchanged.</p>',
   'Authorize your password change\n\nHi {{customer_name}}, a password change was requested for your account. Your password will not change until you open the authorization link below. This link expires {{authorization_expires}}.\n\nAuthorize password change: {{authorization_link}}\n\nIf you did not request this, ignore this message and your password will remain unchanged.', 'active', NOW()::text, NOW()::text),
  ('email-template-password-changed', 'password-changed', 'Password changed notification', 'account.password_changed', 'transactional',
   'Your password was changed', 'Your account password was updated successfully.',
   '<h1>Your password was changed</h1><p>Hi {{customer_name}}, the password for your account was changed successfully.</p><p>All previous signed-in sessions were closed for your protection. Sign in again from your account page: <a href="{{account_link}}">Open your account</a></p><p>If you did not make this change, use the password recovery option immediately and contact support.</p>',
   'Your password was changed\n\nHi {{customer_name}}, the password for your account was changed successfully. All previous signed-in sessions were closed for your protection.\n\nOpen your account: {{account_link}}\n\nIf you did not make this change, use password recovery immediately and contact support.', 'active', NOW()::text, NOW()::text),
  ('email-template-password-reset-authorization', 'password-reset-authorization', 'Password reset authorization', 'account.password_reset_requested', 'transactional',
   'Reset your password', 'Use this one-time link to choose a new account password.',
   '<h1>Reset your password</h1><p>Hi {{customer_name}}, a password reset was requested for your account.</p><p>Choose a new password after opening this one-time link. It expires {{authorization_expires}}.</p><p><a href="{{authorization_link}}">Choose a new password</a></p><p>If you did not request this, you can ignore this message.</p>',
   'Reset your password\n\nHi {{customer_name}}, a password reset was requested for your account. Choose a new password after opening this one-time link. It expires {{authorization_expires}}.\n\nChoose a new password: {{authorization_link}}\n\nIf you did not request this, ignore this message.', 'active', NOW()::text, NOW()::text),
  ('email-template-password-reset-confirmed', 'password-reset-confirmed', 'Password reset confirmation', 'account.password_reset_completed', 'transactional',
   'Your password was reset', 'Your account password has been updated.',
   '<h1>Your password was reset</h1><p>Hi {{customer_name}}, your account password was reset successfully.</p><p>All previous signed-in sessions were closed for your protection. You can sign in again here: <a href="{{account_link}}">Open sign in</a></p><p>If you did not make this change, contact support immediately.</p>',
   'Your password was reset\n\nHi {{customer_name}}, your account password was reset successfully. All previous signed-in sessions were closed for your protection.\n\nOpen sign in: {{account_link}}\n\nIf you did not make this change, contact support immediately.', 'active', NOW()::text, NOW()::text),
  ('email-template-email-change-current-authorization', 'email-change-current-authorization', 'Current email change authorization', 'account.email_change_requested', 'transactional',
   'Authorize your email address change', 'Confirm that you want to change the email on your account.',
   '<h1>Authorize your email address change</h1><p>Hi {{customer_name}}, a request was made to change your account email address.</p><p>Authorize the change from your current email address. A second verification is required at the new address before the change takes effect.</p><p>This link expires {{authorization_expires}}.</p><p><a href="{{authorization_link}}">Authorize email change</a></p><p>If you did not request this, ignore this message and contact support.</p>',
   'Authorize your email address change\n\nHi {{customer_name}}, a request was made to change your account email address. Authorize the change from your current email address. A second verification is required at the new address before the change takes effect. This link expires {{authorization_expires}}.\n\nAuthorize email change: {{authorization_link}}\n\nIf you did not request this, ignore this message and contact support.', 'active', NOW()::text, NOW()::text),
  ('email-template-email-change-new-verification', 'email-change-new-verification', 'New email address verification', 'account.email_change_requested', 'transactional',
   'Verify your new email address', 'Confirm this address to finish your account email change.',
   '<h1>Verify your new email address</h1><p>Hi {{customer_name}}, this address was entered as the new email for your account.</p><p>Open the link below to verify it. The change takes effect only after both the current and new addresses are verified.</p><p>This link expires {{authorization_expires}}.</p><p><a href="{{authorization_link}}">Verify new email address</a></p><p>If you did not request this, ignore this message.</p>',
   'Verify your new email address\n\nHi {{customer_name}}, this address was entered as the new email for your account. Open the link below to verify it. The change takes effect only after both the current and new addresses are verified. This link expires {{authorization_expires}}.\n\nVerify new email address: {{authorization_link}}\n\nIf you did not request this, ignore this message.', 'active', NOW()::text, NOW()::text),
  ('email-template-email-changed', 'email-changed', 'Email address changed notification', 'account.email_changed', 'transactional',
   'Your account email address was changed', 'Your account now uses a new email address.',
   '<h1>Your account email address was changed</h1><p>Hi {{customer_name}}, your account email address was changed successfully.</p><p>The previous address was {{old_email}} and the new address is {{new_email}}. All previous signed-in sessions were closed for your protection.</p><p>If you did not make this change, contact support immediately.</p>',
   'Your account email address was changed\n\nHi {{customer_name}}, your account email address was changed successfully. The previous address was {{old_email}} and the new address is {{new_email}}. All previous signed-in sessions were closed for your protection.\n\nIf you did not make this change, contact support immediately.', 'active', NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;
