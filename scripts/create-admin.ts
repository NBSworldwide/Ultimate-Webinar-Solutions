import { randomUUID } from "node:crypto";
import { closeDatabase, getDb, assertStandaloneDataset } from "@/lib/db";
import { hashPassword } from "@/lib/password";

async function main(): Promise<void> {
  try {
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const name = process.env.INITIAL_ADMIN_NAME?.trim() || "Webinar Administrator";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set a valid INITIAL_ADMIN_EMAIL.");
    if (!password || password.length < 20) throw new Error("INITIAL_ADMIN_PASSWORD must be at least 20 characters.");

    await assertStandaloneDataset();
    const database = getDb();
    const existing = await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
    if (Number(existing.rows[0].count) > 0) throw new Error("An admin account already exists; this command never replaces one.");

    const now = new Date().toISOString();
    await database.query(`
      INSERT INTO users (id, email, name, role, password_hash, created_at)
      VALUES ($1, $2, $3, 'admin', $4, $5)
    `, [`user-admin-${randomUUID()}`, email, name, hashPassword(password), now]);
    console.log(`Admin account created for ${email}. The password was not printed or stored in the database in plaintext.`);
  } catch (error) {
    console.error("Admin setup failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
