import fs from "node:fs/promises";
import path from "node:path";
import type { DatabasePool } from "@/lib/db";

export async function runMigrations(database: DatabasePool): Promise<string[]> {
  const directory = path.join(process.cwd(), "migrations");
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  const client = await database.connect();
  const applied: string[] = [];

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS webinar_schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);
    await client.query("LOCK TABLE webinar_schema_migrations IN EXCLUSIVE MODE");

    for (const file of files) {
      const existing = await client.query("SELECT version FROM webinar_schema_migrations WHERE version = $1", [file]);
      if (existing.rows.length > 0) continue;

      const sql = await fs.readFile(path.join(directory, file), "utf8");
      const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
      for (const statement of statements) await client.query(statement);
      await client.query("INSERT INTO webinar_schema_migrations (version, applied_at) VALUES ($1, $2)", [file, new Date().toISOString()]);
      applied.push(file);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  return applied;
}
