import { cache } from "react";
import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { MediaAsset } from "@/lib/types";

export const uploadableImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type UploadableImageType = typeof uploadableImageTypes[number];

export interface MediaAssetInput {
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  altText?: string;
  caption?: string;
}

type MediaRow = DatabaseRow & {
  id: string;
  file_name: string;
  storage_key: string;
  url: string;
  mime_type: string;
  file_size: number | string;
  width: number | string | null;
  height: number | string | null;
  alt_text: string;
  caption: string;
  status: "active" | "trashed";
  created_at: string;
  updated_at: string;
};

const fields = `id, file_name, storage_key, url, mime_type, file_size, width, height,
  alt_text, caption, status, created_at, updated_at`;

function toMedia(row: MediaRow): MediaAsset {
  return {
    id: row.id,
    fileName: row.file_name,
    storageKey: row.storage_key,
    url: row.url,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    width: row.width === null ? null : Number(row.width),
    height: row.height === null ? null : Number(row.height),
    altText: row.alt_text,
    caption: row.caption,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readMediaAssets(database: Pick<DatabaseClient, "query">, filters?: { query?: string; includeTrashed?: boolean }): Promise<MediaAsset[]> {
  const values: unknown[] = [];
  const conditions = [filters?.includeTrashed ? "1 = 1" : "status = 'active'"];
  const query = filters?.query?.trim();
  if (query) {
    values.push(`%${query}%`);
    conditions.push(`(file_name ILIKE $${values.length} OR alt_text ILIKE $${values.length} OR caption ILIKE $${values.length})`);
  }
  const { rows } = await database.query<MediaRow>(`SELECT ${fields} FROM media_assets WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC, file_name`, values);
  return rows.map(toMedia);
}

export const getMediaAssets = cache(async (filters?: { query?: string; includeTrashed?: boolean }): Promise<MediaAsset[]> => {
  await assertStandaloneDataset();
  return readMediaAssets(getDb(), filters);
});

export async function getMediaAsset(id: string): Promise<MediaAsset | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<MediaRow>(`SELECT ${fields} FROM media_assets WHERE id = $1`, [id]);
  return rows[0] ? toMedia(rows[0]) : null;
}

function safeText(value: string | undefined, max: number): string {
  return (value ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

export function validateMediaAssetInput(input: MediaAssetInput): MediaAssetInput {
  const fileName = safeText(input.fileName, 160);
  const storageKey = safeText(input.storageKey, 180);
  const url = safeText(input.url, 300);
  if (!fileName || !storageKey || !/^\/media\/[A-Za-z0-9._/-]+$/.test(url)) throw new DomainError("Media files must use a safe local media URL.");
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(storageKey) || storageKey.includes("..") || storageKey.includes("\\")) throw new DomainError("The media storage key is invalid.");
  if (!uploadableImageTypes.includes(input.mimeType as UploadableImageType) && input.mimeType !== "image/svg+xml") throw new DomainError("Only supported image formats can be added to the Media Library.");
  if (!Number.isInteger(input.fileSize) || input.fileSize < 0 || input.fileSize > 10 * 1024 * 1024) throw new DomainError("Media files must be 10 MB or smaller.");
  const width = input.width === null || input.width === undefined ? null : Math.max(1, Math.min(10_000, Math.round(input.width)));
  const height = input.height === null || input.height === undefined ? null : Math.max(1, Math.min(10_000, Math.round(input.height)));
  return { fileName, storageKey, url, mimeType: input.mimeType, fileSize: input.fileSize, width, height, altText: safeText(input.altText, 300), caption: safeText(input.caption, 500) };
}

export async function createMediaAsset(input: MediaAssetInput, actorId: string): Promise<MediaAsset> {
  await assertStandaloneDataset();
  const normalized = validateMediaAssetInput(input);
  const id = randomUUID();
  const now = new Date().toISOString();
  await getDb().query(`INSERT INTO media_assets (id, file_name, storage_key, url, mime_type, file_size, width, height, alt_text, caption, created_by, updated_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$12)`, [id, normalized.fileName, normalized.storageKey, normalized.url, normalized.mimeType, normalized.fileSize, normalized.width, normalized.height, normalized.altText, normalized.caption, actorId, now]);
  await getDb().query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'media.created','media_asset',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, fileName: normalized.fileName, mimeType: normalized.mimeType }), now]);
  const result = await getMediaAsset(id);
  if (!result) throw new Error("The media asset could not be reloaded.");
  return result;
}

export async function updateMediaAsset(id: string, input: Pick<MediaAssetInput, "altText" | "caption">, actorId: string): Promise<MediaAsset> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const result = await getDb().query(`UPDATE media_assets SET alt_text=$1, caption=$2, updated_by=$3, updated_at=$4 WHERE id=$5 RETURNING ${fields}`, [safeText(input.altText, 300), safeText(input.caption, 500), actorId, now, id]);
  if (!result.rows[0]) throw new DomainError("Media asset not found.", 404);
  await getDb().query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'media.updated','media_asset',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true }), now]);
  return toMedia(result.rows[0] as MediaRow);
}

export async function trashMediaAsset(id: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const result = await getDb().query("UPDATE media_assets SET status='trashed', updated_by=$1, updated_at=$2 WHERE id=$3 AND status='active'", [actorId, now, id]);
  if (!result.rowCount) throw new DomainError("Media asset was not found or is already in the trash.", 404);
  await getDb().query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'media.trashed','media_asset',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true }), now]);
}
