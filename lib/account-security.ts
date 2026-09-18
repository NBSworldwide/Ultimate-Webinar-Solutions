import { randomBytes, randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { queueCorrespondence } from "@/lib/email";
import { destroyAllUserSessions, hashToken } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { AccountProfile, AccountProfileInput, User } from "@/lib/types";

const PASSWORD_LINK_MINUTES = 30;
const PASSWORD_LINK_TTL = PASSWORD_LINK_MINUTES * 60_000;
const EMAIL_LINK_HOURS = 24;
const EMAIL_LINK_TTL = EMAIL_LINK_HOURS * 60 * 60_000;

type AccountProfileRow = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: User["role"];
  phone: string;
  mobile_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
};

type SecurityUserRow = Pick<AccountProfileRow, "id" | "email" | "name">;

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function tokenLink(path: string, token: string): string {
  return `${appUrl()}${path}?token=${encodeURIComponent(token)}`;
}

function createToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

function normalizeField(value: string, label: string, maxLength: number, required = false): string {
  const normalized = value.trim();
  if (required && !normalized) throw new DomainError(`${label} is required.`);
  if (normalized.length > maxLength) throw new DomainError(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 240) throw new DomainError("Enter a valid email address.");
  return email;
}

function assertNewPassword(password: string): void {
  if (password.length < 12 || password.length > 200) throw new DomainError("Use a password between 12 and 200 characters.");
}

function toAccountProfile(row: AccountProfileRow): AccountProfile {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    phone: row.phone ?? "",
    mobilePhone: row.mobile_phone ?? "",
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    city: row.city ?? "",
    region: row.region ?? "",
    postalCode: row.postal_code ?? "",
    country: row.country ?? "",
  };
}

export async function getAccountProfile(userId: string, client?: DatabaseClient): Promise<AccountProfile> {
  const database = client ?? getDb();
  if (!client) await assertStandaloneDataset();
  const result = await database.query<AccountProfileRow>(
    `SELECT id, email, username, name, role, phone, mobile_phone, address_line1, address_line2,
       city, region, postal_code, country
     FROM users WHERE id = $1`,
    [userId],
  );
  if (!result.rows[0]) throw new DomainError("The account could not be found.", 404);
  return toAccountProfile(result.rows[0]);
}

type EmailChangeRequestResult = { requestId: string; oldEmail: string; newEmail: string };

async function createEmailChangeRequest(
  client: DatabaseClient,
  user: SecurityUserRow,
  newEmail: string,
  now: string,
): Promise<EmailChangeRequestResult> {
  if (user.email === newEmail) throw new DomainError("That is already the email on this account.");
  const existing = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE lower(email) = lower($1) AND id <> $2 LIMIT 1",
    [newEmail, user.id],
  );
  if (existing.rows[0]) throw new DomainError("That email address is already used by another account.", 409);

  await client.query(
    "UPDATE email_change_requests SET cancelled_at = $2 WHERE user_id = $1 AND cancelled_at IS NULL AND completed_at IS NULL",
    [user.id, now],
  );
  const oldToken = createToken();
  const newToken = createToken();
  const requestId = `email-change-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + EMAIL_LINK_TTL).toISOString();
  await client.query(
    `INSERT INTO email_change_requests
      (id, user_id, old_email, new_email, old_token_hash, new_token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [requestId, user.id, user.email, newEmail, oldToken.hash, newToken.hash, expiresAt, now],
  );
  await client.query(
    `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
     VALUES ($1, $2, 'account.email_change_requested', 'email_change_request', $3, $4, $5)`,
    [randomUUID(), user.id, requestId, JSON.stringify({ fields: ["email"], requiresCurrentAndNewVerification: true, synthetic: false }), now],
  );

  const sharedPayload = {
    customer_name: user.name,
    authorization_expires: `${EMAIL_LINK_HOURS} hours`,
  };
  await queueCorrespondence({
    templateSlug: "email-change-current-authorization",
    triggerKey: "account.email_change_requested",
    recipientEmail: user.email,
    recipientName: user.name,
    entityType: "email_change_request",
    entityId: requestId,
    payload: { ...sharedPayload, authorization_link: tokenLink("/api/account/email/verify", oldToken.raw) },
    idempotencyKey: `${requestId}:current-email`,
    client,
  });
  await queueCorrespondence({
    templateSlug: "email-change-new-verification",
    triggerKey: "account.email_change_requested",
    recipientEmail: newEmail,
    recipientName: user.name,
    entityType: "email_change_request",
    entityId: requestId,
    payload: { ...sharedPayload, authorization_link: tokenLink("/api/account/email/verify", newToken.raw) },
    idempotencyKey: `${requestId}:new-email`,
    client,
  });
  return { requestId, oldEmail: user.email, newEmail };
}

export async function updateAccountProfile(userId: string, input: AccountProfileInput): Promise<{ profile: AccountProfile; emailChangeRequested: boolean }> {
  await assertStandaloneDataset();
  const name = normalizeField(input.name, "Full name", 120, true);
  const email = normalizeEmail(input.email);
  const phone = normalizeField(input.phone, "Phone number", 40);
  const mobilePhone = normalizeField(input.mobilePhone, "Mobile phone number", 40);
  const addressLine1 = normalizeField(input.addressLine1, "Address", 160);
  const addressLine2 = normalizeField(input.addressLine2, "Address line 2", 160);
  const city = normalizeField(input.city, "City", 100);
  const region = normalizeField(input.region, "State or region", 100);
  const postalCode = normalizeField(input.postalCode, "ZIP or postal code", 24);
  const country = normalizeField(input.country, "Country", 80);
  const client = await getDb().connect();
  let emailChangeRequested = false;
  try {
    await client.query("BEGIN");
    const currentResult = await client.query<SecurityUserRow & AccountProfileRow>(
      "SELECT id, email, username, name, role, phone, mobile_phone, address_line1, address_line2, city, region, postal_code, country FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    const current = currentResult.rows[0];
    if (!current) throw new DomainError("The account could not be found.", 404);
    if (email !== current.email) {
      await createEmailChangeRequest(client, current, email, new Date().toISOString());
      emailChangeRequested = true;
    }
    const changedFields = [
      ["name", name !== current.name],
      ["phone", phone !== (current.phone ?? "")],
      ["mobilePhone", mobilePhone !== (current.mobile_phone ?? "")],
      ["address", addressLine1 !== (current.address_line1 ?? "") || addressLine2 !== (current.address_line2 ?? "")],
      ["city", city !== (current.city ?? "")],
      ["region", region !== (current.region ?? "")],
      ["postalCode", postalCode !== (current.postal_code ?? "")],
      ["country", country !== (current.country ?? "")],
      ["email", emailChangeRequested],
    ].filter(([, changed]) => changed).map(([field]) => field);
    await client.query(
      `UPDATE users SET name = $2, phone = $3, mobile_phone = $4, address_line1 = $5,
         address_line2 = $6, city = $7, region = $8, postal_code = $9, country = $10
       WHERE id = $1`,
      [userId, name, phone, mobilePhone, addressLine1, addressLine2, city, region, postalCode, country],
    );
    if (changedFields.length > 0) {
      await client.query(
        `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
         VALUES ($1, $2, 'account.profile_updated', 'user', $3, $4, $5)`,
        [randomUUID(), userId, userId, JSON.stringify({ fields: changedFields, emailChangeRequested, synthetic: false }), new Date().toISOString()],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return { profile: await getAccountProfile(userId), emailChangeRequested };
}

export async function requestPasswordChange(userId: string, newPassword: string): Promise<void> {
  assertNewPassword(newPassword);
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query<SecurityUserRow>("SELECT id, email, name FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const user = userResult.rows[0];
    if (!user) throw new DomainError("The account could not be found.", 404);
    const now = new Date().toISOString();
    await client.query("UPDATE password_change_requests SET consumed_at = $2 WHERE user_id = $1 AND consumed_at IS NULL", [userId, now]);
    const token = createToken();
    const requestId = `password-change-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + PASSWORD_LINK_TTL).toISOString();
    await client.query(
      `INSERT INTO password_change_requests (id, user_id, token_hash, password_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [requestId, userId, token.hash, hashPassword(newPassword), expiresAt, now],
    );
    await client.query(
      `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
       VALUES ($1, $2, 'account.password_change_requested', 'password_change_request', $3, $4, $5)`,
      [randomUUID(), userId, requestId, JSON.stringify({ expiresInMinutes: PASSWORD_LINK_MINUTES, synthetic: false }), now],
    );
    await queueCorrespondence({
      templateSlug: "password-change-authorization",
      triggerKey: "account.password_change_requested",
      recipientEmail: user.email,
      recipientName: user.name,
      entityType: "password_change_request",
      entityId: requestId,
      payload: { customer_name: user.name, authorization_expires: `${PASSWORD_LINK_MINUTES} minutes`, authorization_link: tokenLink("/api/account/password/verify", token.raw) },
      idempotencyKey: `${requestId}:authorization`,
      client,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

type PasswordResetType = "account_recovery" | "admin_reset";

async function createPasswordResetRequest(client: DatabaseClient, user: SecurityUserRow, requestType: PasswordResetType, requestedByUserId: string | null, now: string): Promise<void> {
  await client.query("UPDATE password_reset_requests SET consumed_at = $2 WHERE user_id = $1 AND consumed_at IS NULL", [user.id, now]);
  const token = createToken();
  const requestId = `password-reset-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + PASSWORD_LINK_TTL).toISOString();
  await client.query(
    `INSERT INTO password_reset_requests (id, user_id, requested_by_user_id, request_type, token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [requestId, user.id, requestedByUserId, requestType, token.hash, expiresAt, now],
  );
  await client.query(
    `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
     VALUES ($1, $2, 'account.password_reset_requested', 'password_reset_request', $3, $4, $5)`,
    [randomUUID(), requestedByUserId, requestId, JSON.stringify({ requestType, expiresInMinutes: PASSWORD_LINK_MINUTES, synthetic: false }), now],
  );
  await queueCorrespondence({
    templateSlug: "password-reset-authorization",
    triggerKey: "account.password_reset_requested",
    recipientEmail: user.email,
    recipientName: user.name,
    entityType: "password_reset_request",
    entityId: requestId,
    payload: { customer_name: user.name, authorization_expires: `${PASSWORD_LINK_MINUTES} minutes`, authorization_link: tokenLink("/reset-password", token.raw) },
    idempotencyKey: `${requestId}:authorization`,
    client,
  });
}

export async function requestPasswordReset(identifier: string): Promise<void> {
  await assertStandaloneDataset();
  const database = getDb();
  const normalized = identifier.trim().toLowerCase();
  const result = await database.query<SecurityUserRow>(
    "SELECT id, email, name FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($1) LIMIT 1",
    [normalized],
  );
  const user = result.rows[0];
  if (!user) return;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await createPasswordResetRequest(client, user, "account_recovery", null, new Date().toISOString());
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function requestAdminPasswordReset(targetUserId: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const actorResult = await client.query<{ role: User["role"] }>("SELECT role FROM users WHERE id = $1", [actorId]);
    if (actorResult.rows[0]?.role !== "admin") throw new DomainError("Only administrators can send account reset links.", 403);
    const targetResult = await client.query<SecurityUserRow>("SELECT id, email, name FROM users WHERE id = $1 FOR UPDATE", [targetUserId]);
    const target = targetResult.rows[0];
    if (!target) throw new DomainError("The account could not be found.", 404);
    await createPasswordResetRequest(client, target, "admin_reset", actorId, new Date().toISOString());
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function authorizePasswordChange(tokenValue: string): Promise<void> {
  if (tokenValue.trim().length < 20) throw new DomainError("This password authorization link is invalid or has expired.");
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      user_id: string;
      email: string;
      name: string;
      password_hash: string;
      expires_at: string;
      consumed_at: string | null;
    }>(
      `SELECT r.id, r.user_id, u.email, u.name, r.password_hash, r.expires_at, r.consumed_at
       FROM password_change_requests r JOIN users u ON u.id = r.user_id
       WHERE r.token_hash = $1 FOR UPDATE`,
      [hashToken(tokenValue)],
    );
    const request = result.rows[0];
    if (!request || request.consumed_at || new Date(request.expires_at).getTime() <= Date.now()) throw new DomainError("This password authorization link is invalid or has expired.");
    const now = new Date().toISOString();
    await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [request.user_id, request.password_hash]);
    await client.query("UPDATE password_change_requests SET consumed_at = $2 WHERE id = $1", [request.id, now]);
    await destroyAllUserSessions(request.user_id, client);
    await client.query(
      `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
       VALUES ($1, $2, 'account.password_changed', 'user', $3, $4, $5)`,
      [randomUUID(), request.user_id, request.user_id, JSON.stringify({ method: "authorized-link", synthetic: false }), now],
    );
    await queueCorrespondence({
      templateSlug: "password-changed",
      triggerKey: "account.password_changed",
      recipientEmail: request.email,
      recipientName: request.name,
      entityType: "user",
      entityId: request.user_id,
      payload: { customer_name: request.name, changed_at: now, account_link: `${appUrl()}/login` },
      idempotencyKey: `${request.id}:changed-notification`,
      client,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function completePasswordReset(tokenValue: string, newPassword: string): Promise<void> {
  assertNewPassword(newPassword);
  if (tokenValue.trim().length < 20) throw new DomainError("This password reset link is invalid or has expired.");
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      user_id: string;
      requested_by_user_id: string | null;
      request_type: PasswordResetType;
      email: string;
      name: string;
      expires_at: string;
      consumed_at: string | null;
    }>(
      `SELECT r.id, r.user_id, r.requested_by_user_id, r.request_type, u.email, u.name, r.expires_at, r.consumed_at
       FROM password_reset_requests r JOIN users u ON u.id = r.user_id
       WHERE r.token_hash = $1 FOR UPDATE`,
      [hashToken(tokenValue)],
    );
    const request = result.rows[0];
    if (!request || request.consumed_at || new Date(request.expires_at).getTime() <= Date.now()) throw new DomainError("This password reset link is invalid or has expired.");
    const now = new Date().toISOString();
    await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [request.user_id, hashPassword(newPassword)]);
    await client.query("UPDATE password_reset_requests SET consumed_at = $2 WHERE id = $1", [request.id, now]);
    await destroyAllUserSessions(request.user_id, client);
    await client.query(
      `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
       VALUES ($1, $2, 'account.password_reset_completed', 'user', $3, $4, $5)`,
      [randomUUID(), request.requested_by_user_id, request.user_id, JSON.stringify({ requestType: request.request_type, synthetic: false }), now],
    );
    await queueCorrespondence({
      templateSlug: "password-reset-confirmed",
      triggerKey: "account.password_reset_completed",
      recipientEmail: request.email,
      recipientName: request.name,
      entityType: "user",
      entityId: request.user_id,
      payload: { customer_name: request.name, changed_at: now, account_link: `${appUrl()}/login` },
      idempotencyKey: `${request.id}:completed-notification`,
      client,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyEmailChangeToken(tokenValue: string): Promise<{ completed: boolean; alreadyVerified: boolean }> {
  if (tokenValue.trim().length < 20) throw new DomainError("This email verification link is invalid or has expired.");
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const tokenHash = hashToken(tokenValue);
    const result = await client.query<{
      id: string;
      user_id: string;
      old_email: string;
      new_email: string;
      old_token_hash: string;
      old_verified_at: string | null;
      new_verified_at: string | null;
      expires_at: string;
      cancelled_at: string | null;
      completed_at: string | null;
      name: string;
    }>(
      `SELECT r.id, r.user_id, r.old_email, r.new_email, r.old_token_hash, r.old_verified_at,
         r.new_verified_at, r.expires_at, r.cancelled_at, r.completed_at, u.name
       FROM email_change_requests r JOIN users u ON u.id = r.user_id
       WHERE r.old_token_hash = $1 OR r.new_token_hash = $1 FOR UPDATE`,
      [tokenHash],
    );
    const request = result.rows[0];
    if (!request || request.cancelled_at || request.completed_at || new Date(request.expires_at).getTime() <= Date.now()) throw new DomainError("This email verification link is invalid or has expired.");
    const isOldToken = request.old_token_hash === tokenHash;
    const alreadyVerified = isOldToken ? Boolean(request.old_verified_at) : Boolean(request.new_verified_at);
    if (alreadyVerified) {
      await client.query("COMMIT");
      return { completed: Boolean(request.old_verified_at && request.new_verified_at), alreadyVerified: true };
    }
    const now = new Date().toISOString();
    const oldVerifiedAt = isOldToken ? now : request.old_verified_at;
    const newVerifiedAt = isOldToken ? request.new_verified_at : now;
    await client.query(
      `UPDATE email_change_requests SET old_verified_at = $2, new_verified_at = $3 WHERE id = $1`,
      [request.id, oldVerifiedAt, newVerifiedAt],
    );
    if (!oldVerifiedAt || !newVerifiedAt) {
      await client.query("COMMIT");
      return { completed: false, alreadyVerified: false };
    }
    await client.query("UPDATE users SET email = $2 WHERE id = $1", [request.user_id, request.new_email]);
    await client.query("UPDATE email_change_requests SET completed_at = $2 WHERE id = $1", [request.id, now]);
    await destroyAllUserSessions(request.user_id, client);
    await client.query(
      `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
       VALUES ($1, $2, 'account.email_changed', 'user', $3, $4, $5)`,
      [randomUUID(), request.user_id, request.user_id, JSON.stringify({ method: "current-and-new-email-verification", synthetic: false }), now],
    );
    const recipients = new Map<string, string>([[request.old_email, request.old_email], [request.new_email, request.new_email]]);
    for (const recipientEmail of recipients.values()) {
      await queueCorrespondence({
        templateSlug: "email-changed",
        triggerKey: "account.email_changed",
        recipientEmail,
        recipientName: request.name,
        entityType: "user",
        entityId: request.user_id,
        payload: { customer_name: request.name, old_email: request.old_email, new_email: request.new_email, changed_at: now },
        idempotencyKey: `${request.id}:changed-notification:${recipientEmail}`,
        client,
      });
    }
    await client.query("COMMIT");
    return { completed: true, alreadyVerified: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
