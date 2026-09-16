import fs from "node:fs/promises";
import path from "node:path";
import type { DatabasePool } from "@/lib/db";

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarQuote: string | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      current += character;
      if (character === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += character;
      if (character === "*" && next === "/") {
        current += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }
    if (dollarQuote) {
      if (sql.startsWith(dollarQuote, index)) {
        current += dollarQuote;
        index += dollarQuote.length - 1;
        dollarQuote = null;
      } else {
        current += character;
      }
      continue;
    }
    if (inSingleQuote) {
      current += character;
      if (character === "'" && next === "'") {
        current += next;
        index += 1;
      } else if (character === "'") {
        inSingleQuote = false;
      }
      continue;
    }
    if (inDoubleQuote) {
      current += character;
      if (character === '"' && next === '"') {
        current += next;
        index += 1;
      } else if (character === '"') {
        inDoubleQuote = false;
      }
      continue;
    }
    if (character === "-" && next === "-") {
      current += character + next;
      index += 1;
      inLineComment = true;
      continue;
    }
    if (character === "/" && next === "*") {
      current += character + next;
      index += 1;
      inBlockComment = true;
      continue;
    }
    if (character === "'") {
      current += character;
      inSingleQuote = true;
      continue;
    }
    if (character === '"') {
      current += character;
      inDoubleQuote = true;
      continue;
    }
    if (character === "$") {
      const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarQuote = match[0];
        current += dollarQuote;
        index += dollarQuote.length - 1;
        continue;
      }
    }
    if (character === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

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
      const statements = splitSqlStatements(sql);
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
