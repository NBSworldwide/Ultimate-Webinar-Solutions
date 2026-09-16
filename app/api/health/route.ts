import { NextResponse } from "next/server";
import { getDb, getSystemMetadata } from "@/lib/db";

export async function GET() {
  try {
    const database = getDb();
    const tables = database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'").get() as { count: number };
    const metadata = getSystemMetadata();
    const datasetOrigin = metadata.dataset_origin;
    const syntheticData = metadata.seed_version?.startsWith("synthetic-") || datasetOrigin === "empty" || datasetOrigin === "synthetic-demo";
    return NextResponse.json({
      status: "ok",
      database: "sqlite",
      tables: tables.count,
      datasetOrigin,
      originalDataImported: datasetOrigin === "imported",
      syntheticData,
      seed: metadata.seed_version,
      schemaVersion: metadata.schema_version,
    });
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
