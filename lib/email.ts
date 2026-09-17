import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { getSiteSettings, readSiteSettings, siteAddressLines, siteContactEmail } from "@/lib/site-settings";
import type { EmailMessageType, EmailOutboxStatus, EmailOutboxView, EmailSequenceStatus, EmailSequenceView, EmailTemplateListItem, EmailTemplateRevisionView, EmailTemplateStatus } from "@/lib/types";

export { DomainError } from "@/lib/errors";

type TemplateInput = {
  name: string;
  slug?: string;
  triggerKey: string;
  messageType: EmailMessageType;
  subject: string;
  preheader?: string;
  htmlBody: string;
  textBody: string;
  status?: EmailTemplateStatus;
};

type SequenceInput = {
  name: string;
  slug?: string;
  triggerKey: string;
  status?: EmailSequenceStatus;
  templateId: string;
  delayMinutes?: number;
};

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `message-${Date.now()}`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function render(source: string, payload: Record<string, string | number>, html: boolean): string {
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const value = payload[key];
    if (value === undefined || value === null) return "";
    return html ? escapeHtml(String(value)) : String(value);
  });
}

export function renderEmailTemplate(template: Pick<EmailTemplateListItem, "subject" | "htmlBody" | "textBody">, payload: Record<string, string | number>): { subject: string; htmlBody: string; textBody: string } {
  return { subject: render(template.subject, payload, false), htmlBody: render(template.htmlBody, payload, true), textBody: render(template.textBody, payload, false) };
}

export async function getEmailTemplates(): Promise<EmailTemplateListItem[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<DatabaseRow & { id: string; slug: string; name: string; trigger_key: string; message_type: EmailMessageType; subject: string; preheader: string; html_body: string; text_body: string; status: EmailTemplateStatus; version: number; updated_at: string }>(`
    SELECT id, slug, name, trigger_key, message_type, subject, preheader, html_body, text_body, status, version, updated_at
    FROM email_templates ORDER BY updated_at DESC, name ASC
  `);
  return rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, triggerKey: row.trigger_key, messageType: row.message_type, subject: row.subject, preheader: row.preheader, htmlBody: row.html_body, textBody: row.text_body, status: row.status, version: Number(row.version), updatedAt: row.updated_at }));
}

export async function getEmailSequences(): Promise<EmailSequenceView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<DatabaseRow & { id: string; slug: string; name: string; trigger_key: string; status: EmailSequenceStatus; updated_at: string; step_id: string | null; step_order: number | null; delay_minutes: number | null; template_id: string | null; template_name: string | null; template_slug: string | null }>(`
    SELECT s.id, s.slug, s.name, s.trigger_key, s.status, s.updated_at,
      st.id AS step_id, st.step_order, st.delay_minutes, st.template_id,
      t.name AS template_name, t.slug AS template_slug
    FROM email_sequences s
    LEFT JOIN email_sequence_steps st ON st.sequence_id = s.id
    LEFT JOIN email_templates t ON t.id = st.template_id
    ORDER BY s.updated_at DESC, st.step_order ASC
  `);
  const grouped = new Map<string, EmailSequenceView>();
  for (const row of rows) {
    const current = grouped.get(row.id) ?? { id: row.id, slug: row.slug, name: row.name, triggerKey: row.trigger_key, status: row.status, steps: [], updatedAt: row.updated_at };
    if (row.step_id && row.template_id && row.template_name && row.template_slug) current.steps.push({ id: row.step_id, stepOrder: Number(row.step_order), delayMinutes: Number(row.delay_minutes), templateId: row.template_id, templateName: row.template_name, templateSlug: row.template_slug });
    grouped.set(row.id, current);
  }
  return [...grouped.values()];
}

export async function getEmailOutbox(limit = 50): Promise<EmailOutboxView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<DatabaseRow & { id: string; trigger_key: string; recipient_email: string; recipient_name: string; entity_type: string; entity_id: string; template_name: string | null; status: EmailOutboxStatus; attempts: number; scheduled_at: string; sent_at: string | null; last_error: string | null; idempotency_key: string; created_at: string }>(`
    SELECT o.id, o.trigger_key, o.recipient_email, o.recipient_name, o.entity_type, o.entity_id,
      t.name AS template_name, o.status, o.attempts, o.scheduled_at, o.sent_at,
      o.last_error, o.idempotency_key, o.created_at
    FROM email_outbox o
    LEFT JOIN email_templates t ON t.id = o.template_id
    ORDER BY o.created_at DESC LIMIT $1
  `, [limit]);
  return rows.map((row) => ({ id: row.id, triggerKey: row.trigger_key, recipientEmail: row.recipient_email, recipientName: row.recipient_name, entityType: row.entity_type, entityId: row.entity_id, templateName: row.template_name, status: row.status, attempts: Number(row.attempts), scheduledAt: row.scheduled_at, sentAt: row.sent_at, lastError: row.last_error, idempotencyKey: row.idempotency_key, createdAt: row.created_at }));
}

export async function createEmailTemplate(input: TemplateInput, actorId: string): Promise<EmailTemplateListItem> {
  await assertStandaloneDataset();
  if (input.name.trim().length < 2 || input.subject.trim().length < 2 || input.htmlBody.trim().length < 2 || input.textBody.trim().length < 2) throw new DomainError("Complete the email template content.");
  const now = new Date().toISOString();
  const id = `email-template-${randomUUID()}`;
  const slug = slugify(input.slug || input.name);
  await getDb().query(`
    INSERT INTO email_templates (id, slug, name, trigger_key, message_type, subject, preheader, html_body, text_body, status, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
  `, [id, slug, input.name.trim(), input.triggerKey.trim(), input.messageType, input.subject.trim(), input.preheader?.trim() ?? "", input.htmlBody.trim(), input.textBody.trim(), input.status ?? "draft", actorId, now]);
  const templates = await getEmailTemplates();
  const created = templates.find((template) => template.id === id);
  if (!created) throw new DomainError("The email template was created but could not be loaded.", 500);
  return created;
}

export async function updateEmailTemplate(id: string, input: Omit<TemplateInput, "slug">, actorId: string): Promise<EmailTemplateListItem> {
  await assertStandaloneDataset();
  if (input.name.trim().length < 2 || input.subject.trim().length < 2 || input.htmlBody.trim().length < 2 || input.textBody.trim().length < 2) throw new DomainError("Complete the email template content.");
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ version: number }>("SELECT version FROM email_templates WHERE id = $1 FOR UPDATE", [id]);
    if (!existing.rows[0]) throw new DomainError("The email template could not be found.", 404);
    const version = Number(existing.rows[0].version) + 1;
    await client.query(`INSERT INTO email_template_revisions (id, template_id, version, subject, preheader, html_body, text_body, edited_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [randomUUID(), id, version, input.subject.trim(), input.preheader?.trim() ?? "", input.htmlBody.trim(), input.textBody.trim(), actorId, now]);
    await client.query(`UPDATE email_templates SET name = $2, trigger_key = $3, message_type = $4, subject = $5, preheader = $6, html_body = $7, text_body = $8, status = $9, version = $10, updated_at = $11 WHERE id = $1`, [id, input.name.trim(), input.triggerKey.trim(), input.messageType, input.subject.trim(), input.preheader?.trim() ?? "", input.htmlBody.trim(), input.textBody.trim(), input.status ?? "draft", version, now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
  const template = (await getEmailTemplates()).find((item) => item.id === id);
  if (!template) throw new DomainError("The email template was updated but could not be loaded.", 500);
  return template;
}

export async function getEmailTemplateRevisions(templateId: string): Promise<EmailTemplateRevisionView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<DatabaseRow & { id: string; template_id: string; version: number; subject: string; preheader: string; html_body: string; text_body: string; edited_by: string | null; created_at: string }>(`
    SELECT id, template_id, version, subject, preheader, html_body, text_body, edited_by, created_at
    FROM email_template_revisions WHERE template_id = $1 ORDER BY version DESC
  `, [templateId]);
  return rows.map((row) => ({ id: row.id, templateId: row.template_id, version: Number(row.version), subject: row.subject, preheader: row.preheader, htmlBody: row.html_body, textBody: row.text_body, editedBy: row.edited_by, createdAt: row.created_at }));
}

export async function createEmailSequence(input: SequenceInput, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  if (input.delayMinutes !== undefined && (!Number.isInteger(input.delayMinutes) || input.delayMinutes < 0)) throw new DomainError("Sequence delay must be zero or greater.");
  const now = new Date().toISOString();
  const sequenceId = `email-sequence-${randomUUID()}`;
  const slug = slugify(input.slug || input.name);
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const template = await client.query("SELECT id FROM email_templates WHERE id = $1", [input.templateId]);
    if (!template.rows[0]) throw new DomainError("Choose an existing email template.", 404);
    await client.query(`INSERT INTO email_sequences (id, slug, name, trigger_key, status, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`, [sequenceId, slug, input.name.trim(), input.triggerKey.trim(), input.status ?? "draft", actorId, now]);
    await client.query(`INSERT INTO email_sequence_steps (id, sequence_id, step_order, delay_minutes, template_id) VALUES ($1, $2, 1, $3, $4)`, [randomUUID(), sequenceId, input.delayMinutes ?? 0, input.templateId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateEmailSequence(id: string, input: Pick<SequenceInput, "name" | "triggerKey" | "status">, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  if (input.name.trim().length < 2 || input.triggerKey.trim().length < 2) throw new DomainError("Complete the sequence fields.");
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query("UPDATE email_sequences SET name = $2, trigger_key = $3, status = $4, updated_at = $5 WHERE id = $1 RETURNING id", [id, input.name.trim(), input.triggerKey.trim(), input.status ?? "draft", now]);
    if (!updated.rows[0]) throw new DomainError("The email sequence could not be found.", 404);
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1, $2, 'email_sequence.updated', 'email_sequence', $3, $4, $5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export type CorrespondenceInput = {
  templateSlug: string;
  triggerKey: string;
  recipientEmail: string;
  recipientName?: string;
  entityType: string;
  entityId: string;
  payload: Record<string, string | number>;
  scheduledAt?: string;
  idempotencyKey: string;
  client?: DatabaseClient;
};

export type SequenceScheduleInput = Omit<CorrespondenceInput, "templateSlug" | "scheduledAt" | "idempotencyKey"> & {
  client?: DatabaseClient;
};

export async function scheduleCorrespondenceSequence(input: SequenceScheduleInput): Promise<number> {
  const database = input.client ?? getDb();
  if (!input.client) await assertStandaloneDataset();
  const sequences = await database.query<{ sequence_id: string; step_id: string; template_slug: string; delay_minutes: number }>(`
    SELECT s.id AS sequence_id, st.id AS step_id, t.slug AS template_slug, st.delay_minutes
    FROM email_sequences s
    JOIN email_sequence_steps st ON st.sequence_id = s.id
    JOIN email_templates t ON t.id = st.template_id
    WHERE s.trigger_key = $1 AND s.status = 'active' AND t.status = 'active'
    ORDER BY s.id, st.step_order
  `, [input.triggerKey]);
  let scheduled = 0;
  for (const step of sequences.rows) {
    const scheduledAt = new Date(Date.now() + Number(step.delay_minutes) * 60_000).toISOString();
    const queued = await queueCorrespondence({ ...input, templateSlug: step.template_slug, scheduledAt, idempotencyKey: `${input.entityType}:${input.entityId}:${step.sequence_id}:${step.step_id}` });
    if (queued) scheduled += 1;
  }
  return scheduled;
}

export async function queueCorrespondence(input: CorrespondenceInput): Promise<string | null> {
  const email = input.recipientEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new DomainError("A valid recipient email is required.");
  const database = input.client ?? getDb();
  if (!input.client) await assertStandaloneDataset();
  const templateResult = await database.query<{ id: string; message_type: EmailMessageType }>("SELECT id, message_type FROM email_templates WHERE slug = $1 AND status = 'active'", [input.templateSlug]);
  const template = templateResult.rows[0];
  if (!template) throw new DomainError(`The active email template ${input.templateSlug} is not configured.`, 500);
  if (template.message_type === "marketing") {
    const suppressed = await database.query("SELECT email FROM email_suppressions WHERE email = $1", [email]);
    if (suppressed.rows[0]) return null;
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  const siteSettings = input.client ? await readSiteSettings(input.client) : await getSiteSettings();
  const sitePayload = {
    ...input.payload,
    site_name: siteSettings.displayName,
    site_legal_name: siteSettings.legalName,
    site_email: siteContactEmail(siteSettings),
    site_phone: siteSettings.phone,
    site_website_url: siteSettings.websiteUrl,
    site_logo_url: siteSettings.logoUrl,
    site_address: siteAddressLines(siteSettings).join(", "),
  };
  await database.query(`
    INSERT INTO email_outbox
      (id, trigger_key, recipient_email, recipient_name, entity_type, entity_id, template_id, payload_json, scheduled_at, idempotency_key, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (idempotency_key) DO NOTHING
  `, [id, input.triggerKey, email, input.recipientName?.trim() ?? "", input.entityType, input.entityId, template.id, JSON.stringify(sitePayload), input.scheduledAt ?? now, input.idempotencyKey, now]);
  return id;
}
