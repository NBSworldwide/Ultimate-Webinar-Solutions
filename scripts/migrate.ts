import { loadProjectEnv } from "./load-env";
import { closeDatabase, getDb } from "@/lib/db";
import { runMigrations } from "@/lib/migrations";

loadProjectEnv();

async function main(): Promise<void> {
  try {
    const applied = await runMigrations(getDb());
    console.log(applied.length ? `Applied migrations: ${applied.join(", ")}` : "Database schema is already current.");
  } catch (error) {
    console.error("Database migration failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
