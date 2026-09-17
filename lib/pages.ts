import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { syncPublishedPageMenuItem } from "@/lib/navigation";
import { normalizePageBlockLayout, normalizePageBlockStyle } from "@/lib/page-styles";
import { hasMapCoordinateInput, normalizeMapLocation } from "@/lib/map-location";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { ContentPage, PageBlock, PageBlockType, PageStatus } from "@/lib/types";

const blockTypes: PageBlockType[] = ["hero", "rich_text", "image", "image_box", "icon_box", "button", "cta", "product_grid", "product_category", "sale_grid", "gallery", "testimonial_grid", "navigation_menu", "html", "map", "spacer", "container"];
const pageFields = `id, slug, title, excerpt, status, blocks_json, seo_title, seo_description,
  created_by, updated_by, created_at, updated_at, published_at`;

type PageRow = DatabaseRow & {
  id: string; slug: string; title: string; excerpt: string; status: PageStatus; blocks_json: string;
  seo_title: string; seo_description: string; created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string; published_at: string | null; revision: number | string;
};

function textValue(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeBlock(block: unknown, index: number, depth: number): PageBlock {
  if (!block || typeof block !== "object") throw new DomainError(`Block ${index + 1} is invalid.`);
  if (depth > 5) throw new DomainError("Containers can be nested no more than five levels deep.");
  const candidate = block as { id?: unknown; type?: unknown; data?: unknown; style?: unknown; layout?: unknown; children?: unknown };
  const type = candidate.type as PageBlockType;
  if (!blockTypes.includes(type)) throw new DomainError(`Block ${index + 1} has an unsupported type.`);
  const source = candidate.data && typeof candidate.data === "object" ? candidate.data as Record<string, unknown> : {};
  const data: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number" && Number.isFinite(value)) data[key] = value;
    else if (typeof value === "string") data[key] = value.trim().slice(0, 5000);
  }
  if (type === "html" && typeof data.html === "string") data.html = sanitizeHtml(data.html);
  if (type === "map") {
    data.locationMode = data.locationMode === "coordinates" ? "coordinates" : "address";
    if (data.locationMode === "coordinates" && hasMapCoordinateInput(data) && !normalizeMapLocation(data)) {
      throw new DomainError("Map coordinates must include a latitude from -90 to 90 and a longitude from -180 to 180.");
    }
    if (typeof data.address === "string") data.address = data.address.slice(0, 240);
  }
  const style = normalizePageBlockStyle(candidate.style);
  const layout = type === "container" ? normalizePageBlockLayout(candidate.layout) : undefined;
  const children = type === "container" ? normalizePageBlocks(candidate.children === undefined ? [] : candidate.children, depth + 1) : undefined;
  return {
    id: textValue(candidate.id, 80) || randomUUID(), type, data,
    ...(style ? { style } : {}), ...(layout ? { layout } : {}), ...(type === "container" ? { children } : {}),
  };
}

export function normalizePageBlocks(input: unknown, depth = 0): PageBlock[] {
  if (!Array.isArray(input)) throw new DomainError("Page content must be an array of blocks.");
  if (input.length > 50) throw new DomainError("A page can contain at most 50 blocks.");
  return input.map((block, index) => normalizeBlock(block, index, depth));
}

function toPage(row: PageRow): ContentPage {
  let blocks: PageBlock[] = [];
  try { blocks = normalizePageBlocks(JSON.parse(row.blocks_json)); } catch { blocks = []; }
  return {
    id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, status: row.status,
    blocks, seoTitle: row.seo_title, seoDescription: row.seo_description, createdBy: row.created_by,
    updatedBy: row.updated_by, createdAt: row.created_at, updatedAt: row.updated_at,
    publishedAt: row.published_at, revision: Number(row.revision ?? 0),
  };
}

function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug || slug.length > 120) throw new DomainError("Choose a valid page slug.");
  return slug;
}

function normalizePageInput(input: PageInput): { slug: string; title: string; excerpt: string; status: PageStatus; blocks: PageBlock[]; seoTitle: string; seoDescription: string } {
  const title = textValue(input.title, 140);
  if (title.length < 2) throw new DomainError("A page title is required.");
  return {
    slug: normalizeSlug(input.slug || title), title, excerpt: textValue(input.excerpt, 500),
    status: input.status, blocks: normalizePageBlocks(input.blocks), seoTitle: textValue(input.seoTitle, 160),
    seoDescription: textValue(input.seoDescription, 300),
  };
}

export type PageInput = { slug: string; title: string; excerpt: string; status: PageStatus; blocks: unknown; seoTitle: string; seoDescription: string };

export async function getPages(filters?: { query?: string; status?: PageStatus | "all" }): Promise<ContentPage[]> {
  await assertStandaloneDataset();
  const values: unknown[] = [];
  const conditions: string[] = [];
  const query = filters?.query?.trim();
  if (query) { values.push(`%${query}%`); conditions.push(`(p.title ILIKE $${values.length} OR p.slug ILIKE $${values.length} OR p.excerpt ILIKE $${values.length})`); }
  if (filters?.status && filters.status !== "all") { values.push(filters.status); conditions.push(`p.status = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await getDb().query<PageRow>(`SELECT p.*, COALESCE((SELECT MAX(version) FROM content_page_revisions r WHERE r.page_id = p.id), 0)::int AS revision FROM content_pages p ${where} ORDER BY p.updated_at DESC`, values);
  return rows.map(toPage);
}

export async function getPageById(id: string): Promise<ContentPage | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<PageRow>(`SELECT p.*, COALESCE((SELECT MAX(version) FROM content_page_revisions r WHERE r.page_id = p.id), 0)::int AS revision FROM content_pages p WHERE p.id = $1`, [id]);
  return rows[0] ? toPage(rows[0]) : null;
}

export async function getPublishedPageBySlug(slug: string): Promise<ContentPage | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<PageRow>(`SELECT p.*, COALESCE((SELECT MAX(version) FROM content_page_revisions r WHERE r.page_id = p.id), 0)::int AS revision FROM content_pages p WHERE p.slug = $1 AND p.status = 'published'`, [normalizeSlug(slug)]);
  return rows[0] ? toPage(rows[0]) : null;
}

export function pageSlugFromTitle(title: string): string { return normalizeSlug(title); }

export async function createPage(input: PageInput, actorId: string): Promise<ContentPage> {
  await assertStandaloneDataset();
  const page = normalizePageInput(input);
  const now = new Date().toISOString();
  const id = randomUUID();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO content_pages (${pageFields.replace(/, /g, ", ")}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [id, page.slug, page.title, page.excerpt, page.status, JSON.stringify(page.blocks), page.seoTitle, page.seoDescription, actorId, actorId, now, now, page.status === "published" ? now : null]);
    await client.query(`INSERT INTO content_page_revisions (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10)`, [randomUUID(), id, page.title, page.excerpt, page.status, JSON.stringify(page.blocks), page.seoTitle, page.seoDescription, actorId, now]);
    await syncPublishedPageMenuItem(client, { id, slug: page.slug, title: page.title, status: page.status }, now);
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'page.created','content_page',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, status: page.status }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("That page slug is already in use.");
    throw error;
  } finally { client.release(); }
  const result = await getPageById(id);
  if (!result) throw new Error("Created page could not be reloaded.");
  return result;
}

export async function updatePage(id: string, input: PageInput, actorId: string): Promise<ContentPage> {
  await assertStandaloneDataset();
  const page = normalizePageInput(input);
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ status: PageStatus; published_at: string | null }>("SELECT status, published_at FROM content_pages WHERE id = $1 FOR UPDATE", [id]);
    if (!existing.rows[0]) throw new DomainError("Page not found.", 404);
    const publishedAt = page.status === "published" ? existing.rows[0].published_at ?? now : null;
    const version = await client.query<{ version: number }>("SELECT COALESCE(MAX(version), 0)::int + 1 AS version FROM content_page_revisions WHERE page_id = $1", [id]);
    await client.query("UPDATE content_pages SET slug=$1,title=$2,excerpt=$3,status=$4,blocks_json=$5,seo_title=$6,seo_description=$7,updated_by=$8,updated_at=$9,published_at=$10 WHERE id=$11", [page.slug, page.title, page.excerpt, page.status, JSON.stringify(page.blocks), page.seoTitle, page.seoDescription, actorId, now, publishedAt, id]);
    await client.query("INSERT INTO content_page_revisions (id,page_id,version,title,excerpt,status,blocks_json,seo_title,seo_description,saved_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [randomUUID(), id, Number(version.rows[0]?.version ?? 1), page.title, page.excerpt, page.status, JSON.stringify(page.blocks), page.seoTitle, page.seoDescription, actorId, now]);
    await syncPublishedPageMenuItem(client, { id, slug: page.slug, title: page.title, status: page.status }, now);
    await client.query("INSERT INTO audit_events (id,actor_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES ($1,$2,'page.updated','content_page',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, status: page.status, blockCount: page.blocks.length }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof DomainError) throw error;
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("That page slug is already in use.");
    throw error;
  } finally { client.release(); }
  const result = await getPageById(id);
  if (!result) throw new Error("Updated page could not be reloaded.");
  return result;
}

export async function deletePage(id: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ status: PageStatus }>("SELECT status FROM content_pages WHERE id = $1 FOR UPDATE", [id]);
    if (!current.rows[0]) throw new DomainError("Page not found.", 404);
    if (current.rows[0].status !== "archived") throw new DomainError("Archive a page before permanently deleting it.", 409);
    await client.query("DELETE FROM navigation_menu_items WHERE item_type = 'page' AND entity_id = $1", [id]);
    await client.query("DELETE FROM content_pages WHERE id = $1", [id]);
    await client.query("INSERT INTO audit_events (id,actor_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES ($1,$2,'page.deleted','content_page',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, permanent: true }), new Date().toISOString()]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
}
