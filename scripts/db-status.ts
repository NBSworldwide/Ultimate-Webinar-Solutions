import { loadProjectEnv } from "./load-env";
import { closeDatabase, getDb } from "@/lib/db";

loadProjectEnv();

async function main(): Promise<void> {
  try {
    const result = await getDb().query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    if (result.rows.length === 0) console.log("Connected successfully. No application tables are present yet.");
    else console.log(`Connected successfully. PostgreSQL tables: ${result.rows.map((row) => row.table_name).join(", ")}`);
  } catch (error) {
    console.error("Database status check failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
