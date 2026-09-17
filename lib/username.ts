export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export function validateUsername(value: string): string {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Username must be 3–32 characters and use only letters, numbers, periods, underscores, or hyphens.");
  }
  return username;
}
