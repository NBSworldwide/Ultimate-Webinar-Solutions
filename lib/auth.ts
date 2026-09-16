import { cookies } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "webinar_session";
const SESSION_DAYS = 14;

function hashToken(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }
  return createHmac("sha256", secret ?? "local-development-session-secret").update(value).digest("hex");
}

function toUser(row: { id: string; email: string; name: string; role: "admin" | "attendee" }): User {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function authenticate(email: string, password: string): User | null {
  const row = getDb().prepare("SELECT id, email, name, role, password_hash FROM users WHERE lower(email) = lower(?)").get(email) as { id: string; email: string; name: string; role: "admin" | "attendee"; password_hash: string } | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return toUser(row);
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  getDb().prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(hashToken(token), userId, expiresAt, new Date().toISOString());
  return token;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = getDb().prepare(`
    SELECT u.id, u.email, u.name, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(hashToken(token)) as { id: string; email: string; name: string; role: "admin" | "attendee"; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return null;
  }
  return toUser(row);
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
