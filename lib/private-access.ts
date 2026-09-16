import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { assertStandaloneDataset, getDb } from "@/lib/db";
import { generateInviteCode, hashInviteCode, hashPrivateAccessToken, normalizeInviteCode, normalizeInviteEmail } from "@/lib/private-access-core";

export { generateInviteCode, hashInviteCode, hashPrivateAccessToken, normalizeInviteCode, normalizeInviteEmail } from "@/lib/private-access-core";

export const PRIVATE_ACCESS_COOKIE = "webinar_private_access";
const PRIVATE_SESSION_DAYS = 14;

export function privateSessionMaxAge(expiresAt: string): number {
  const inviteExpiry = new Date(expiresAt).getTime();
  const sessionExpiry = Date.now() + PRIVATE_SESSION_DAYS * 86_400_000;
  return Math.max(60, Math.floor((Math.min(inviteExpiry, sessionExpiry) - Date.now()) / 1000));
}

export async function getPrivateAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(PRIVATE_ACCESS_COOKIE)?.value ?? null;
}

export async function verifyPrivateInvite(slug: string, email: string, code: string): Promise<{
  accessToken: string;
  inviteId: string;
  webinarId: string;
  webinarSlug: string;
  email: string;
  expiresAt: string;
} | null> {
  await assertStandaloneDataset();
  const normalizedEmail = normalizeInviteEmail(email);
  const normalizedCode = normalizeInviteCode(code);
  if (normalizedCode.length !== 8) return null;

  const now = new Date().toISOString();
  const { rows } = await getDb().query<{
    invite_id: string;
    webinar_id: string;
    webinar_slug: string;
    email: string;
    expires_at: string;
  }>(`
    SELECT wi.id AS invite_id, w.id AS webinar_id, w.slug AS webinar_slug,
      wi.email, wi.expires_at
    FROM webinar_invites wi
    JOIN webinars w ON w.id = wi.webinar_id
    WHERE w.slug = $1
      AND w.visibility = 'private'
      AND w.status IN ('published', 'sold_out')
      AND wi.email = $2
      AND wi.code_hash = $3
      AND wi.expires_at > $4
      AND wi.revoked_at IS NULL
  `, [slug, normalizedEmail, hashInviteCode(normalizedCode), now]);
  const invite = rows[0];
  if (!invite) return null;

  const accessToken = randomBytes(32).toString("base64url");
  const sessionMaxAge = privateSessionMaxAge(invite.expires_at);
  const sessionExpiresAt = new Date(Date.now() + sessionMaxAge * 1000).toISOString();
  await getDb().query(`
    INSERT INTO private_webinar_sessions
      (token_hash, invite_id, webinar_id, email, expires_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [hashPrivateAccessToken(accessToken), invite.invite_id, invite.webinar_id, invite.email, sessionExpiresAt, now]);
  await getDb().query("UPDATE webinar_invites SET last_verified_at = $1 WHERE id = $2", [now, invite.invite_id]);

  return {
    accessToken,
    inviteId: invite.invite_id,
    webinarId: invite.webinar_id,
    webinarSlug: invite.webinar_slug,
    email: invite.email,
    expiresAt: sessionExpiresAt,
  };
}
