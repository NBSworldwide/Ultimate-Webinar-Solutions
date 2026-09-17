import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, getSystemMetadata, type DatabaseClient } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { Role } from "@/lib/types";

/**
 * These identities are reserved for local synthetic testing. Their .test
 * addresses cannot be real customer addresses and are never created by the
 * normal public sign-up flow.
 */
export const DEMO_USER_DEFINITIONS = [
  { key: "admin", id: "demo-user-admin", email: "admin.demo@webinar-studio.test", name: "Demo Administrator", role: "admin", passwordEnv: "DEMO_ADMIN_PASSWORD" },
  { key: "manager", id: "demo-user-manager", email: "manager.demo@webinar-studio.test", name: "Demo Manager", role: "manager", passwordEnv: "DEMO_MANAGER_PASSWORD" },
  { key: "customer", id: "demo-user-customer", email: "customer.demo@webinar-studio.test", name: "Demo Customer", role: "attendee", passwordEnv: "DEMO_CUSTOMER_PASSWORD" },
] as const satisfies ReadonlyArray<{ key: string; id: string; email: string; name: string; role: Role; passwordEnv: string }>;

export type DemoUserKey = (typeof DEMO_USER_DEFINITIONS)[number]["key"];
export type DemoUserPasswords = Partial<Record<DemoUserKey, string>>;

export interface DemoUserSeedRecord {
  email: string;
  name: string;
  role: Role;
  action: "created" | "reset";
}

export interface DemoUserSeedResult {
  users: DemoUserSeedRecord[];
  created: number;
  reset: number;
}

function assertDemoEnvironment(): void {
  const isVercelProductionRuntime = process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
  if (process.env.NODE_ENV === "production" || isVercelProductionRuntime || process.env.DEMO_MODE !== "true") {
    throw new Error("Demo user setup is limited to an explicit non-production DEMO_MODE=true environment.");
  }
  if (process.env.DEMO_USER_SEED_CONFIRMATION !== "local-only-demo-users") {
    throw new Error("Set DEMO_USER_SEED_CONFIRMATION=local-only-demo-users before creating local demo accounts.");
  }
}

function getPassword(definition: (typeof DEMO_USER_DEFINITIONS)[number], passwords?: DemoUserPasswords): string {
  const password = passwords?.[definition.key] ?? process.env[definition.passwordEnv];
  if (!password || password.length < 20 || password.length > 200) {
    throw new Error(`${definition.passwordEnv} must be set to a unique password between 20 and 200 characters.`);
  }
  return password;
}

async function recordAudit(client: DatabaseClient, eventType: string, entityId: string, role: Role, now: string): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
     VALUES ($1, NULL, $2, 'user', $3, $4, $5)`,
    [randomUUID(), eventType, entityId, JSON.stringify({ role, synthetic: true, source: "demo-user-seed" }), now],
  );
}

/**
 * Create or reset exactly three synthetic accounts for local role testing.
 * Passwords are accepted from the caller or environment and are never
 * returned, logged, or persisted in plaintext.
 */
export async function seedDemoUsers(passwords?: DemoUserPasswords): Promise<DemoUserSeedResult> {
  // Keep environment checks synchronous and before any database connection.
  assertDemoEnvironment();
  for (const definition of DEMO_USER_DEFINITIONS) getPassword(definition, passwords);

  await assertStandaloneDataset();
  const metadata = await getSystemMetadata();
  if (metadata.dataset_origin !== "standalone") {
    throw new Error("Demo accounts can only be created in a database marked as the standalone dataset.");
  }
  const client = await getDb().connect();
  const users: DemoUserSeedRecord[] = [];
  let created = 0;
  let reset = 0;

  try {
    await client.query("BEGIN");
    const now = new Date().toISOString();

    for (const definition of DEMO_USER_DEFINITIONS) {
      const password = getPassword(definition, passwords);
      const existing = await client.query<{ id: string; name: string; role: Role }>(
        "SELECT id, name, role FROM users WHERE email = $1",
        [definition.email],
      );
      const row = existing.rows[0];

      if (!row) {
        await client.query(
          `INSERT INTO users (id, email, name, role, password_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [definition.id, definition.email, definition.name, definition.role, hashPassword(password), now],
        );
        await recordAudit(client, "team.demo_user_created", definition.id, definition.role, now);
        users.push({ email: definition.email, name: definition.name, role: definition.role, action: "created" });
        created += 1;
        continue;
      }

      // Never take ownership of an address that was not created by this seed.
      if (row.id !== definition.id) {
        throw new Error(`The reserved demo address ${definition.email} belongs to another account; no changes were made.`);
      }

      await client.query(
        `UPDATE users
         SET name = $2, role = $3, password_hash = $4
         WHERE id = $1`,
        [definition.id, definition.name, definition.role, hashPassword(password)],
      );
      await recordAudit(client, "team.demo_user_reset", definition.id, definition.role, now);
      users.push({ email: definition.email, name: definition.name, role: definition.role, action: "reset" });
      reset += 1;
    }

    await client.query(
      `INSERT INTO system_metadata (key, value, updated_at) VALUES ('demo_users_version', 'demo-users-v1', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [now],
    );
    await client.query("COMMIT");
    return { users, created, reset };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
