import { NextResponse } from "next/server";
import { assertStandaloneDataset, getDb, getSystemMetadata } from "@/lib/db";

export async function GET() {
  try {
    const database = getDb();
    const tables = await database.query<{ count: number }>(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const metadata = await getSystemMetadata();
    await assertStandaloneDataset();
    const datasetOrigin = metadata.dataset_origin;
    const syntheticData = metadata.seed_version?.startsWith("synthetic-") || datasetOrigin === "empty" || datasetOrigin === "synthetic-demo";
    return NextResponse.json({
      status: "ok",
      database: "postgres",
      tables: tables.rows[0]?.count ?? 0,
      datasetOrigin,
      originalDataImported: metadata.original_data_imported === "true" || datasetOrigin === "imported",
      syntheticData,
      seed: metadata.seed_version,
      schemaVersion: metadata.schema_version,
    });
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
