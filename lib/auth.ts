import { cookies } from "next/headers";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { Role, User } from "@/lib/types";

export { hasCapability, isStaff, roleLabel } from "@/lib/authorization";
export type { Capability } from "@/lib/authorization";

export const SESSION_COOKIE = "webinar_session";
const SESSION_DAYS = 14;

export class AccountCreationError extends Error {
  statusCode = 409;

  constructor(message = "An account with that email already exists. Sign in instead.") {
    super(message);
    this.name = "AccountCreationError";
  }
}

/** Only allow local paths when a sign-in or account-creation flow returns a customer to a session. */
export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\r\n]/.test(value)) return fallback;
  return value;
}

function hashToken(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }
  return createHmac("sha256", secret ?? "local-development-session-secret").update(value).digest("hex");
}

function toUser(row: { id: string; email: string; name: string; role: Role }): User {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function createAttendeeAccount(input: { name: string; email: string; password: string }): Promise<User> {
  await assertStandaloneDataset();
  const user = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: "attendee" as const,
  };
  try {
    await getDb().query(
      "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [user.id, user.email, user.name, user.role, hashPassword(input.password), new Date().toISOString()],
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new AccountCreationError();
    }
    throw error;
  }
  return user;
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<{
    id: string;
    email: string;
    name: string;
    role: Role;
    password_hash: string;
  }>("SELECT id, email, name, role, password_hash FROM users WHERE lower(email) = lower($1)", [email]);
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return toUser(row);
}

export async function createSession(userId: string): Promise<string> {
  await assertStandaloneDataset();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await getDb().query(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [hashToken(token), userId, expiresAt, new Date().toISOString()],
  );
  return token;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await assertStandaloneDataset();
  const tokenHash = hashToken(token);
  const { rows } = await getDb().query<{
    id: string;
    email: string;
    name: string;
    role: Role;
    expires_at: string;
  }>(`
    SELECT u.id, u.email, u.name, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1
  `, [tokenHash]);
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await getDb().query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }
  return toUser(row);
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await assertStandaloneDataset();
    await getDb().query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
}
