import { loadProjectEnv } from "./load-env";
import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, closeDatabase, getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { validateUsername } from "@/lib/username";
import type { Role } from "@/lib/types";

loadProjectEnv();

async function main(): Promise<void> {
  try {
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const username = process.env.INITIAL_ADMIN_USERNAME?.trim();
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const name = process.env.INITIAL_ADMIN_NAME?.trim() || "Webinar Administrator";
    const existingAccountOnly = process.env.INITIAL_ADMIN_EXISTING_ACCOUNT_ONLY === "true";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set a valid INITIAL_ADMIN_EMAIL.");
    const normalizedUsername = username ? validateUsername(username) : null;
    if (!password || password.length < 20 || password.length > 200) throw new Error("INITIAL_ADMIN_PASSWORD must be between 20 and 200 characters.");

    await assertStandaloneDataset();
    const client = await getDb().connect();
    try {
      await client.query("BEGIN");
      const existingAdmin = await client.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
      if (Number(existingAdmin.rows[0]?.count ?? 0) > 0) throw new Error("An Administrator already exists; this one-time command will not change an existing Administrator.");

      const matchingAccount = normalizedUsername
        ? await client.query<{ id: string; name: string; role: Role }>(
          "SELECT id, name, role FROM users WHERE lower(email) = lower($1) AND lower(username) = lower($2) FOR UPDATE",
          [email, normalizedUsername],
        )
        : await client.query<{ id: string; name: string; role: Role }>(
          "SELECT id, name, role FROM users WHERE lower(email) = lower($1) FOR UPDATE",
          [email],
        );
      const now = new Date().toISOString();
      const account = matchingAccount.rows[0];

      if (account) {
        await client.query("UPDATE users SET role = 'admin', password_hash = $2 WHERE id = $1", [account.id, hashPassword(password)]);
        await client.query(
          `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
           VALUES ($1, NULL, 'team.first_admin_bootstrapped', 'user', $2, $3, $4)`,
          [randomUUID(), account.id, JSON.stringify({ previousRole: account.role, method: "existing-account", synthetic: false }), now],
        );
        await client.query("COMMIT");
        console.log(`The existing account for ${email} was promoted to the first Administrator. The password was not printed or stored in plaintext.`);
        return;
      }

      if (existingAccountOnly) throw new Error(normalizedUsername ? "No account matched the supplied email and username; no changes were made. Check both values and run the command again." : "No account matched the supplied email; no changes were made. Check the value and run the command again.");
      if (!normalizedUsername) throw new Error("Set INITIAL_ADMIN_USERNAME when creating a new Administrator account.");
      const id = `user-admin-${randomUUID()}`;
      await client.query(
        `INSERT INTO users (id, email, username, name, role, password_hash, created_at)
         VALUES ($1, $2, $3, $4, 'admin', $5, $6)`,
        [id, email, normalizedUsername, name, hashPassword(password), now],
      );
      await client.query(
        `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
         VALUES ($1, NULL, 'team.first_admin_bootstrapped', 'user', $2, $3, $4)`,
        [randomUUID(), id, JSON.stringify({ method: "new-account", synthetic: false }), now],
      );
      await client.query("COMMIT");
      console.log(`The first Administrator account was created for ${email}. The password was not printed or stored in plaintext.`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Admin setup failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
