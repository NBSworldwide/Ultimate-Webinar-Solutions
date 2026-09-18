import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { normalizePageBlocks } from "@/lib/pages";
import type { PageBlock, PageBlockLayout, SiteTemplate, SiteTemplateKind, SiteTemplateStatus } from "@/lib/types";

const templateKinds: SiteTemplateKind[] = ["header", "footer"];
const templateStatuses: SiteTemplateStatus[] = ["draft", "published", "archived"];

const starterLayout = (direction: "row" | "column"): PageBlockLayout => ({
  mode: "flex", contentWidth: "full", spacing: "global", direction,
  justifyContent: direction === "row" ? "space-between" : "start", alignItems: "stretch",
  wrap: "nowrap", columns: direction === "row" ? 2 : 1, rows: 1, autoFlow: "row", justifyItems: "stretch",
});

export function templateStarterBlocks(kind: SiteTemplateKind): PageBlock[] {
  if (kind === "header") {
    return [{
      id: randomUUID(), type: "container", data: {}, layout: starterLayout("row"), children: [
        { id: randomUUID(), type: "heading", data: { text: "Webinar Studio", tag: "h2", link: "/", linkTarget: "same", linkNofollow: "no" } },
        { id: randomUUID(), type: "navigation_menu", data: { heading: "Primary navigation", menuId: "navigation-menu-primary", layout: "horizontal" } },
      ],
    }];
  }
  return [{
    id: randomUUID(), type: "container", data: {}, layout: starterLayout("column"), children: [
      { id: randomUUID(), type: "rich_text", data: { heading: "Stay in the loop", body: "Keep the next session, replay, and support path easy to find." } },
      { id: randomUUID(), type: "navigation_menu", data: { heading: "Footer navigation", menuId: "navigation-menu-footer", layout: "horizontal" } },
    ],
  }];
}

type TemplateRow = DatabaseRow & {
  id: string;
  kind: SiteTemplateKind;
  name: string;
  status: SiteTemplateStatus;
  is_active: boolean | number;
  blocks_json: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  revision: number | string;
};

function textValue(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toTemplate(row: TemplateRow): SiteTemplate {
  let blocks: PageBlock[] = [];
  try { blocks = normalizePageBlocks(JSON.parse(row.blocks_json)); } catch { blocks = []; }
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    status: row.status,
    isActive: Boolean(row.is_active),
    blocks,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    revision: Number(row.revision ?? 0),
  };
}

function normalizeKind(value: unknown): SiteTemplateKind {
  if (typeof value !== "string" || !templateKinds.includes(value as SiteTemplateKind)) throw new DomainError("Choose a header or footer template.");
  return value as SiteTemplateKind;
}

function normalizeStatus(value: unknown): SiteTemplateStatus {
  if (typeof value !== "string" || !templateStatuses.includes(value as SiteTemplateStatus)) throw new DomainError("Choose a valid template status.");
  return value as SiteTemplateStatus;
}

function normalizeTemplateInput(input: { kind: SiteTemplateKind; name: string; status: SiteTemplateStatus; isActive?: boolean; blocks: unknown }): { kind: SiteTemplateKind; name: string; status: SiteTemplateStatus; isActive: boolean; blocks: PageBlock[] } {
  const kind = normalizeKind(input.kind);
  const name = textValue(input.name, 120);
  if (name.length < 2) throw new DomainError("A template name is required.");
  const status = normalizeStatus(input.status);
  const isActive = input.isActive === true && status === "published";
  return { kind, name, status, isActive, blocks: normalizePageBlocks(input.blocks) };
}

const templateFields = `t.id, t.kind, t.name, t.status, t.is_active, t.blocks_json,
  t.created_by, t.updated_by, t.created_at, t.updated_at, t.published_at,
  COALESCE((SELECT MAX(version) FROM site_template_revisions r WHERE r.template_id = t.id), 0)::int AS revision`;

export function isSiteTemplateSchemaUnavailable(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate?.code === "42P01" && typeof candidate.message === "string" && /site_template/i.test(candidate.message);
}

export function isFallbackSiteTemplate(template: Pick<SiteTemplate, "id"> | null | undefined): boolean {
  return Boolean(template?.id.startsWith("fallback-"));
}

function fallbackActiveTemplate(kind: SiteTemplateKind): SiteTemplate {
  const now = new Date(0).toISOString();
  return {
    id: `fallback-${kind}`,
    kind,
    name: kind === "header" ? "Default Header" : "Default Footer",
    status: "published",
    isActive: true,
    blocks: templateStarterBlocks(kind),
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    revision: 0,
  };
}

export async function getSiteTemplates(kind?: SiteTemplateKind): Promise<SiteTemplate[]> {
  await assertStandaloneDataset();
  const values: unknown[] = [];
  const filter = kind ? "WHERE t.kind = $1" : "";
  if (kind) values.push(normalizeKind(kind));
  const { rows } = await getDb().query<TemplateRow>(`SELECT ${templateFields} FROM site_templates t ${filter} ORDER BY t.kind, t.is_active DESC, t.updated_at DESC`, values);
  return rows.map(toTemplate);
}

export async function getSiteTemplateById(id: string): Promise<SiteTemplate | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<TemplateRow>(`SELECT ${templateFields} FROM site_templates t WHERE t.id = $1`, [id]);
  return rows[0] ? toTemplate(rows[0]) : null;
}

export async function getActiveSiteTemplate(kind: SiteTemplateKind): Promise<SiteTemplate | null> {
  await assertStandaloneDataset();
  const normalizedKind = normalizeKind(kind);
  try {
    const { rows } = await getDb().query<TemplateRow>(`SELECT ${templateFields} FROM site_templates t WHERE t.kind = $1 AND t.status = 'published' AND t.is_active = TRUE LIMIT 1`, [normalizedKind]);
    return rows[0] ? toTemplate(rows[0]) : null;
  } catch (error) {
    if (!isSiteTemplateSchemaUnavailable(error)) throw error;
    return fallbackActiveTemplate(normalizedKind);
  }
}

export type SiteTemplateInput = { kind: SiteTemplateKind; name: string; status: SiteTemplateStatus; isActive?: boolean; blocks: unknown };

export async function createSiteTemplate(input: SiteTemplateInput, actorId: string): Promise<SiteTemplate> {
  await assertStandaloneDataset();
  const template = normalizeTemplateInput(input);
  const id = randomUUID();
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    if (template.isActive) await client.query("UPDATE site_templates SET is_active = FALSE WHERE kind = $1", [template.kind]);
    await client.query("INSERT INTO site_templates (id, kind, name, status, is_active, blocks_json, created_by, updated_by, created_at, updated_at, published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$8,$9)", [id, template.kind, template.name, template.status, template.isActive, JSON.stringify(template.blocks), actorId, now, template.status === "published" ? now : null]);
    await client.query("INSERT INTO site_template_revisions (id, template_id, version, name, status, is_active, blocks_json, saved_by, created_at) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8)", [randomUUID(), id, template.name, template.status, template.isActive, JSON.stringify(template.blocks), actorId, now]);
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'site_template.created','site_template',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, kind: template.kind }), now]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
  const result = await getSiteTemplateById(id);
  if (!result) throw new Error("Created template could not be reloaded.");
  return result;
}

export async function updateSiteTemplate(id: string, input: SiteTemplateInput, actorId: string): Promise<SiteTemplate> {
  await assertStandaloneDataset();
  const template = normalizeTemplateInput(input);
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ kind: SiteTemplateKind; published_at: string | null }>("SELECT kind, published_at FROM site_templates WHERE id = $1 FOR UPDATE", [id]);
    if (!current.rows[0]) throw new DomainError("Template not found.", 404);
    if (template.isActive) await client.query("UPDATE site_templates SET is_active = FALSE WHERE kind = $1 AND id <> $2", [template.kind, id]);
    const version = await client.query<{ version: number }>("SELECT COALESCE(MAX(version), 0)::int + 1 AS version FROM site_template_revisions WHERE template_id = $1", [id]);
    const publishedAt = template.status === "published" ? current.rows[0].published_at ?? now : null;
    await client.query("UPDATE site_templates SET kind=$1,name=$2,status=$3,is_active=$4,blocks_json=$5,updated_by=$6,updated_at=$7,published_at=$8 WHERE id=$9", [template.kind, template.name, template.status, template.isActive, JSON.stringify(template.blocks), actorId, now, publishedAt, id]);
    await client.query("INSERT INTO site_template_revisions (id, template_id, version, name, status, is_active, blocks_json, saved_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [randomUUID(), id, Number(version.rows[0]?.version ?? 1), template.name, template.status, template.isActive, JSON.stringify(template.blocks), actorId, now]);
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'site_template.updated','site_template',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, kind: template.kind, blockCount: template.blocks.length }), now]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
  const result = await getSiteTemplateById(id);
  if (!result) throw new Error("Updated template could not be reloaded.");
  return result;
}

export async function archiveSiteTemplate(id: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ kind: SiteTemplateKind; is_active: boolean }>("SELECT kind, is_active FROM site_templates WHERE id = $1 FOR UPDATE", [id]);
    if (!current.rows[0]) throw new DomainError("Template not found.", 404);
    if (current.rows[0].is_active) throw new DomainError("Choose another active template before archiving this one.", 409);
    await client.query("UPDATE site_templates SET status='archived', updated_by=$1, updated_at=$2, published_at=NULL WHERE id=$3", [actorId, new Date().toISOString(), id]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
}
