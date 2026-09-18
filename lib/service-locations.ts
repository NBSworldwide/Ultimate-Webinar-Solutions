import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { syncPublishedPageMenuItem } from "@/lib/navigation";
import type { ContentPage, PageBlock, PageStatus } from "@/lib/types";
import type { ServiceLocation, ServiceLocationFaq } from "@/content/locations";

export type ManagedServiceLocation = ServiceLocation & {
  id: string;
  pageId: string;
  pageSlug: string;
  pageStatus: PageStatus;
  pageRevision: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceLocationInput = {
  slug: string;
  city: string;
  region: string;
  timezone: string;
  accent: ServiceLocation["accent"];
  eyebrow: string;
  title: string;
  summary: string;
  description: string;
  bestFor: string[];
  deliveryModes: string[];
  faqs: ServiceLocationFaq[];
  status: PageStatus;
};

type ServiceLocationRow = DatabaseRow & {
  id: string;
  page_id: string;
  slug: string;
  city: string;
  region: string;
  timezone: string;
  accent: ServiceLocation["accent"];
  eyebrow: string;
  title: string;
  summary: string;
  description: string;
  best_for_json: string;
  delivery_modes_json: string;
  faqs_json: string;
  created_at: string;
  updated_at: string;
  page_slug: string;
  page_status: PageStatus;
  page_revision: number | string;
};

type EditableLocationRow = ServiceLocationRow & {
  page_title: string;
  page_excerpt: string;
  page_seo_title: string;
  page_seo_description: string;
  page_blocks_json: string;
  page_published_at: string | null;
};

const locationFields = `l.id, l.page_id, l.slug, l.city, l.region, l.timezone, l.accent,
  l.eyebrow, l.title, l.summary, l.description, l.best_for_json, l.delivery_modes_json,
  l.faqs_json, l.created_at, l.updated_at, p.slug AS page_slug, p.status AS page_status,
  COALESCE((SELECT MAX(version) FROM content_page_revisions r WHERE r.page_id = p.id), 0)::int AS page_revision`;

function parseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function parseStringList(value: string): string[] {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function parseFaqs(value: string): ServiceLocationFaq[] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const faq = item as { question?: unknown; answer?: unknown };
    const question = typeof faq.question === "string" ? faq.question.trim() : "";
    const answer = typeof faq.answer === "string" ? faq.answer.trim() : "";
    return question && answer ? [{ question, answer }] : [];
  });
}

function toManagedLocation(row: ServiceLocationRow): ManagedServiceLocation {
  return {
    id: row.id,
    pageId: row.page_id,
    pageSlug: row.page_slug,
    pageStatus: row.page_status,
    pageRevision: Number(row.page_revision ?? 0),
    slug: row.slug,
    city: row.city,
    region: row.region,
    timezone: row.timezone,
    accent: row.accent,
    eyebrow: row.eyebrow,
    title: row.title,
    summary: row.summary,
    description: row.description,
    bestFor: parseStringList(row.best_for_json),
    deliveryModes: parseStringList(row.delivery_modes_json),
    faqs: parseFaqs(row.faqs_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function textValue(value: unknown, label: string, max: number): string {
  const text = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (!text) throw new DomainError(`${label} is required.`);
  return text;
}

function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!slug) throw new DomainError("Choose a valid location slug.");
  return slug;
}

function normalizeList(values: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(values)) throw new DomainError(`${label} must be a list.`);
  const result = values.map((value) => typeof value === "string" ? value.trim().slice(0, maxLength) : "").filter(Boolean).slice(0, maxItems);
  if (result.length === 0) throw new DomainError(`Add at least one ${label.toLowerCase()}.`);
  return result;
}

function normalizeFaqs(values: unknown): ServiceLocationFaq[] {
  if (!Array.isArray(values)) throw new DomainError("FAQs must be a list.");
  return values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as { question?: unknown; answer?: unknown };
    const question = typeof item.question === "string" ? item.question.trim().slice(0, 240) : "";
    const answer = typeof item.answer === "string" ? item.answer.trim().slice(0, 1_000) : "";
    return question && answer ? [{ question, answer }] : [];
  }).slice(0, 12);
}

function normalizeInput(input: ServiceLocationInput): ServiceLocationInput {
  const accent = ["teal", "coral", "gold"].includes(input.accent) ? input.accent : "teal";
  const status = ["draft", "published", "archived"].includes(input.status) ? input.status : "draft";
  return {
    slug: normalizeSlug(input.slug || input.city),
    city: textValue(input.city, "City", 100),
    region: textValue(input.region, "State or region", 100),
    timezone: textValue(input.timezone, "Timezone", 80),
    accent,
    eyebrow: typeof input.eyebrow === "string" && input.eyebrow.trim() ? input.eyebrow.trim().slice(0, 140) : `Sample coverage · ${input.timezone.trim().slice(0, 60)}`,
    title: textValue(input.title, "Page title", 180),
    summary: textValue(input.summary, "Summary", 500),
    description: textValue(input.description, "Description", 2_000),
    bestFor: normalizeList(input.bestFor, "good fit", 12, 240),
    deliveryModes: normalizeList(input.deliveryModes, "delivery mode", 12, 180),
    faqs: normalizeFaqs(input.faqs),
    status,
  };
}

export function locationPageSlug(slug: string): string { return `location-${normalizeSlug(slug)}`; }

export function buildLocationDetailBlocks(slug: string): PageBlock[] {
  return [{ id: `${normalizeSlug(slug)}-location-template`, type: "location_detail", data: { locationSlug: normalizeSlug(slug) } }];
}

async function queryLocations(where = "", values: unknown[] = []): Promise<ManagedServiceLocation[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<ServiceLocationRow>(`SELECT ${locationFields} FROM service_locations l JOIN content_pages p ON p.id = l.page_id ${where} ORDER BY l.city, l.region`, values);
  return rows.map(toManagedLocation);
}

export async function getServiceLocations(options: { includeUnpublished?: boolean } = {}): Promise<ManagedServiceLocation[]> {
  return queryLocations(options.includeUnpublished ? "" : "WHERE p.status = 'published'");
}

export async function getServiceLocation(slug: string, options: { includeUnpublished?: boolean } = {}): Promise<ManagedServiceLocation | null> {
  const rows = await queryLocations(`${options.includeUnpublished ? "WHERE" : "WHERE p.status = 'published' AND"} l.slug = $1`, [normalizeSlug(slug)]);
  return rows[0] ?? null;
}

export async function getServiceLocationById(id: string, options: { includeUnpublished?: boolean } = {}): Promise<ManagedServiceLocation | null> {
  const rows = await queryLocations(`${options.includeUnpublished ? "WHERE" : "WHERE p.status = 'published' AND"} l.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createServiceLocation(input: ServiceLocationInput, actorId: string): Promise<ManagedServiceLocation> {
  await assertStandaloneDataset();
  const location = normalizeInput(input);
  const id = randomUUID();
  const pageId = randomUUID();
  const pageSlug = locationPageSlug(location.slug);
  const blocks = buildLocationDetailBlocks(location.slug);
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const duplicate = await client.query("SELECT id FROM service_locations WHERE slug = $1", [location.slug]);
    if (duplicate.rows[0]) throw new DomainError("That service location slug is already in use.", 409);
    const pageDuplicate = await client.query("SELECT id FROM content_pages WHERE slug = $1", [pageSlug]);
    if (pageDuplicate.rows[0]) throw new DomainError("That service location already has a page.", 409);
    await client.query("INSERT INTO content_pages (id,slug,title,excerpt,status,blocks_json,seo_title,seo_description,is_homepage,created_by,updated_by,created_at,updated_at,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9,$9,$10,$10,$11)", [pageId, pageSlug, location.title, location.summary, location.status, JSON.stringify(blocks), location.title, location.summary, actorId, now, location.status === "published" ? now : null]);
    await client.query("INSERT INTO content_page_revisions (id,page_id,version,title,excerpt,status,blocks_json,seo_title,seo_description,saved_by,created_at) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10)", [randomUUID(), pageId, location.title, location.summary, location.status, JSON.stringify(blocks), location.title, location.summary, actorId, now]);
    await client.query("INSERT INTO service_locations (id,page_id,slug,city,region,timezone,accent,eyebrow,title,summary,description,best_for_json,delivery_modes_json,faqs_json,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)", [id, pageId, location.slug, location.city, location.region, location.timezone, location.accent, location.eyebrow, location.title, location.summary, location.description, JSON.stringify(location.bestFor), JSON.stringify(location.deliveryModes), JSON.stringify(location.faqs), now]);
    await syncPublishedPageMenuItem(client, { id: pageId, slug: pageSlug, title: location.title, status: location.status, isHomepage: false }, now);
    await client.query("INSERT INTO audit_events (id,actor_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES ($1,$2,'service_location.created','service_location',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, slug: location.slug, pageStatus: location.status }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof DomainError) throw error;
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("That service location is already in use.", 409);
    throw error;
  } finally { client.release(); }
  const result = await getServiceLocationById(id, { includeUnpublished: true });
  if (!result) throw new Error("The service location was created but could not be loaded.");
  return result;
}

function updateLocationBlockSlugs(value: unknown, oldSlug: string, nextSlug: string): unknown {
  if (Array.isArray(value)) return value.map((item) => updateLocationBlockSlugs(item, oldSlug, nextSlug));
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const next: Record<string, unknown> = { ...source };
  if (source.type === "location_detail" && source.data && typeof source.data === "object") {
    const data = { ...(source.data as Record<string, unknown>) };
    if (data.locationSlug === oldSlug) data.locationSlug = nextSlug;
    next.data = data;
  }
  if (Array.isArray(source.children)) next.children = updateLocationBlockSlugs(source.children, oldSlug, nextSlug);
  return next;
}

export async function updateServiceLocation(id: string, input: ServiceLocationInput, actorId: string): Promise<ManagedServiceLocation> {
  await assertStandaloneDataset();
  const location = normalizeInput(input);
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const currentResult = await client.query<EditableLocationRow>(`SELECT l.*, p.slug AS page_slug, p.status AS page_status, p.title AS page_title, p.excerpt AS page_excerpt, p.seo_title AS page_seo_title, p.seo_description AS page_seo_description, p.blocks_json AS page_blocks_json, p.published_at AS page_published_at, COALESCE((SELECT MAX(version) FROM content_page_revisions r WHERE r.page_id = p.id), 0)::int AS page_revision FROM service_locations l JOIN content_pages p ON p.id = l.page_id WHERE l.id = $1 FOR UPDATE`, [id]);
    const current = currentResult.rows[0];
    if (!current) throw new DomainError("Service location not found.", 404);
    const duplicate = await client.query("SELECT id FROM service_locations WHERE slug = $1 AND id <> $2", [location.slug, id]);
    if (duplicate.rows[0]) throw new DomainError("That service location slug is already in use.", 409);
    const nextPageSlug = locationPageSlug(location.slug);
    const pageDuplicate = await client.query("SELECT id FROM content_pages WHERE slug = $1 AND id <> $2", [nextPageSlug, current.page_id]);
    if (pageDuplicate.rows[0]) throw new DomainError("That service location page URL is already in use.", 409);
    const parsedBlocks = parseJson(current.page_blocks_json);
    const blocks = Array.isArray(parsedBlocks) ? updateLocationBlockSlugs(parsedBlocks, current.slug, location.slug) : buildLocationDetailBlocks(location.slug);
    const pageTitle = current.page_title === current.title ? location.title : current.page_title;
    const pageExcerpt = current.page_excerpt === current.summary ? location.summary : current.page_excerpt;
    const seoTitle = current.page_seo_title === current.title ? location.title : current.page_seo_title;
    const seoDescription = current.page_seo_description === current.summary ? location.summary : current.page_seo_description;
    const publishedAt = location.status === "published" ? current.page_published_at ?? now : null;
    const version = await client.query<{ version: number }>("SELECT COALESCE(MAX(version), 0)::int + 1 AS version FROM content_page_revisions WHERE page_id = $1", [current.page_id]);
    await client.query("UPDATE service_locations SET slug=$1,city=$2,region=$3,timezone=$4,accent=$5,eyebrow=$6,title=$7,summary=$8,description=$9,best_for_json=$10,delivery_modes_json=$11,faqs_json=$12,updated_at=$13 WHERE id=$14", [location.slug, location.city, location.region, location.timezone, location.accent, location.eyebrow, location.title, location.summary, location.description, JSON.stringify(location.bestFor), JSON.stringify(location.deliveryModes), JSON.stringify(location.faqs), now, id]);
    await client.query("UPDATE content_pages SET slug=$1,title=$2,excerpt=$3,status=$4,blocks_json=$5,seo_title=$6,seo_description=$7,updated_by=$8,updated_at=$9,published_at=$10 WHERE id=$11", [nextPageSlug, pageTitle, pageExcerpt, location.status, JSON.stringify(blocks), seoTitle, seoDescription, actorId, now, publishedAt, current.page_id]);
    await client.query("INSERT INTO content_page_revisions (id,page_id,version,title,excerpt,status,blocks_json,seo_title,seo_description,saved_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [randomUUID(), current.page_id, Number(version.rows[0]?.version ?? 1), pageTitle, pageExcerpt, location.status, JSON.stringify(blocks), seoTitle, seoDescription, actorId, now]);
    await syncPublishedPageMenuItem(client, { id: current.page_id, slug: nextPageSlug, title: pageTitle, status: location.status, isHomepage: false }, now);
    await client.query("INSERT INTO audit_events (id,actor_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES ($1,$2,'service_location.updated','service_location',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, slug: location.slug, pageStatus: location.status }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof DomainError) throw error;
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("That service location is already in use.", 409);
    throw error;
  } finally { client.release(); }
  const result = await getServiceLocationById(id, { includeUnpublished: true });
  if (!result) throw new Error("The service location was updated but could not be loaded.");
  return result;
}
