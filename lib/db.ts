import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Vercel's Node.js runtime has WebSocket support, but setting the constructor
// explicitly also keeps local development predictable across Node versions.
neonConfig.webSocketConstructor = ws;

export type DatabaseRow = Record<string, unknown>;

export interface QueryResult<Row extends DatabaseRow = DatabaseRow> {
  rows: Row[];
  rowCount: number | null;
}

export interface DatabaseClient {
  query<Row extends DatabaseRow = DatabaseRow>(sql: string, values?: unknown[]): Promise<QueryResult<Row>>;
  release(): void;
}

export interface DatabasePool {
  query<Row extends DatabaseRow = DatabaseRow>(sql: string, values?: unknown[]): Promise<QueryResult<Row>>;
  connect(): Promise<DatabaseClient>;
  end?(): Promise<void>;
}

const globalForWebinar = globalThis as typeof globalThis & {
  webinarPool?: DatabasePool;
  webinarTestPool?: DatabasePool;
};

export function isDemoMode(): boolean {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  return !isProduction && process.env.DEMO_MODE !== "false";
}

function createPool(): DatabasePool {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Connect a PostgreSQL database before starting the app.");
  }

  const pool = new Pool({
    connectionString,
    // The Neon pooler is the connection limit boundary; keeping each function
    // instance's local pool small prevents serverless bursts exhausting it.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  return {
    query: (sql, values) => pool.query(sql, values),
    connect: async () => {
      const client = await pool.connect();
      return {
        query: (sql, values) => client.query(sql, values),
        release: () => client.release(),
      };
    },
    end: () => pool.end(),
  };
}

export function getDb(): DatabasePool {
  if (process.env.NODE_ENV === "test" && globalForWebinar.webinarTestPool) {
    return globalForWebinar.webinarTestPool;
  }
  globalForWebinar.webinarPool ??= createPool();
  return globalForWebinar.webinarPool;
}

/** Test-only dependency injection; production always uses the configured Neon pool. */
export function setTestDatabase(pool: DatabasePool): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("A test database can only be injected while NODE_ENV=test.");
  }
  globalForWebinar.webinarTestPool = pool;
}

export async function closeDatabase(): Promise<void> {
  const pool = process.env.NODE_ENV === "test" ? globalForWebinar.webinarTestPool : globalForWebinar.webinarPool;
  await pool?.end?.();
  if (process.env.NODE_ENV === "test") delete globalForWebinar.webinarTestPool;
  else delete globalForWebinar.webinarPool;
}

export async function getSystemMetadata(): Promise<Record<string, string>> {
  const { rows } = await getDb().query<{ key: string; value: string }>(
    "SELECT key, value FROM system_metadata ORDER BY key",
  );
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

export async function assertStandaloneDataset(): Promise<void> {
  const metadata = await getSystemMetadata();
  if (!metadata.dataset_origin) {
    throw new Error("The database is not initialized. Run the database migrations and sample seed first.");
  }
  if (metadata.dataset_origin === "imported") {
    throw new Error("This release refuses to serve imported legacy data.");
  }
  if (!["standalone", "production"].includes(metadata.dataset_origin)) {
    throw new Error("The database has an unrecognized dataset origin.");
  }
  if (metadata.original_data_imported !== "false") {
    throw new Error("The database is not explicitly marked as free of imported customer or product data.");
  }
}
