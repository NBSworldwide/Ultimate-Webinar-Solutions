import { createHash, randomBytes } from "node:crypto";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeInviteCode(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function hashInviteCode(value: string): string {
  return createHash("sha256").update(normalizeInviteCode(value)).digest("hex");
}

export function hashPrivateAccessToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateInviteCode(): string {
  const bytes = randomBytes(8);
  const raw = Array.from(bytes, (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}
