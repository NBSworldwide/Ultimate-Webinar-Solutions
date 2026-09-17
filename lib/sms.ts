import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { SmsMessageType, SmsOutboxStatus, SmsOutboxView, SmsTemplateRevisionView, SmsTemplateStatus, SmsTemplateView } from "@/lib/types";

type SmsTemplateRow = DatabaseRow & {
  id: string;
  slug: string;
  name: string;
  trigger_key: string;
  message_type: SmsMessageType;
  body: string;
  status: SmsTemplateStatus;
  version: number;
  updated_at: string;
};

type SmsOutboxRow = DatabaseRow & {
  id: string;
  trigger_key: string;
  recipient_phone: string;
  recipient_name: string;
  entity_type: string;
  entity_id: string;
  template_name: string | null;
  message_body: string;
  status: SmsOutboxStatus;
  attempts: number;
  scheduled_at: string;
  provider_message_id: string | null;
  sent_at: string | null;
  last_error: string | null;
  idempotency_key: string;
  created_at: string;
};

export type SmsTemplateInput = {
  name: string;
  slug?: string;
  triggerKey: string;
  messageType: SmsMessageType;
  body: string;
  status?: SmsTemplateStatus;
};

export type SmsQueueInput = {
  templateSlug: string;
  triggerKey: string;
  recipientPhone: string;
  recipientName?: string;
  entityType: string;
  entityId: string;
  payload: Record<string, string | number>;
  scheduledAt?: string;
  idempotencyKey: string;
  client?: DatabaseClient;
};

export type SmsProcessingResult = {
  enabled: boolean;
  provider: string;
  configured: boolean;
  claimed: number;
  sent: number;
  failed: number;
};

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `message-${Date.now()}`;
}

function validateTemplate(input: SmsTemplateInput): void {
  if (input.name.trim().length < 2 || input.triggerKey.trim().length < 2 || input.body.trim().length < 2) throw new DomainError("Complete the SMS template fields.");
  if (input.body.length > 1600) throw new DomainError("Keep the SMS template under 1,600 characters.");
}

export function normalizeSmsPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new DomainError("A phone number is required for SMS notifications.");
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(trimmed.replace(/[\s().-]/g, ""))) return trimmed.replace(/[\s().-]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new DomainError("Enter a valid phone number with a country code, such as +1 555 010 0142.");
}

export function renderSmsTemplate(body: string, payload: Record<string, string | number>): string {
  const rendered = body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const value = payload[key];
    return value === undefined || value === null ? "" : String(value);
  }).trim();
  if (!rendered) throw new DomainError("The SMS message cannot be empty.");
  if (rendered.length > 1600) throw new DomainError("The SMS message is too long. Keep it under 1,600 characters.");
  return rendered;
}

function toTemplate(row: SmsTemplateRow): SmsTemplateView {
  return { id: row.id, slug: row.slug, name: row.name, triggerKey: row.trigger_key, messageType: row.message_type, body: row.body, status: row.status, version: Number(row.version), updatedAt: row.updated_at };
}

function toOutbox(row: SmsOutboxRow): SmsOutboxView {
  return { id: row.id, triggerKey: row.trigger_key, recipientPhone: row.recipient_phone, recipientName: row.recipient_name, entityType: row.entity_type, entityId: row.entity_id, templateName: row.template_name, messageBody: row.message_body, status: row.status, attempts: Number(row.attempts), scheduledAt: row.scheduled_at, providerMessageId: row.provider_message_id, sentAt: row.sent_at, lastError: row.last_error, idempotencyKey: row.idempotency_key, createdAt: row.created_at };
}

export async function getSmsTemplates(): Promise<SmsTemplateView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<SmsTemplateRow>("SELECT id, slug, name, trigger_key, message_type, body, status, version, updated_at FROM sms_templates ORDER BY updated_at DESC, name ASC");
  return rows.map(toTemplate);
}

export async function getSmsOutbox(limit = 50): Promise<SmsOutboxView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<SmsOutboxRow>(`
    SELECT o.id, o.trigger_key, o.recipient_phone, o.recipient_name, o.entity_type, o.entity_id,
      t.name AS template_name, o.message_body, o.status, o.attempts, o.scheduled_at,
      o.provider_message_id, o.sent_at, o.last_error, o.idempotency_key, o.created_at
    FROM sms_outbox o
    LEFT JOIN sms_templates t ON t.id = o.template_id
    ORDER BY o.created_at DESC LIMIT $1
  `, [limit]);
  return rows.map(toOutbox);
}

export async function getSmsTemplateRevisions(templateId: string): Promise<SmsTemplateRevisionView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<DatabaseRow & { id: string; template_id: string; version: number; body: string; edited_by: string | null; created_at: string }>("SELECT id, template_id, version, body, edited_by, created_at FROM sms_template_revisions WHERE template_id = $1 ORDER BY version DESC", [templateId]);
  return rows.map((row) => ({ id: row.id, templateId: row.template_id, version: Number(row.version), body: row.body, editedBy: row.edited_by, createdAt: row.created_at }));
}

export async function createSmsTemplate(input: SmsTemplateInput, actorId: string): Promise<SmsTemplateView> {
  await assertStandaloneDataset();
  validateTemplate(input);
  const now = new Date().toISOString();
  const id = `sms-template-${randomUUID()}`;
  await getDb().query("INSERT INTO sms_templates (id, slug, name, trigger_key, message_type, body, status, version, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $9)", [id, slugify(input.slug || input.name), input.name.trim(), input.triggerKey.trim(), input.messageType, input.body.trim(), input.status ?? "draft", actorId, now]);
  const template = (await getSmsTemplates()).find((item) => item.id === id);
  if (!template) throw new DomainError("The SMS template was created but could not be loaded.", 500);
  return template;
}

export async function updateSmsTemplate(id: string, input: Omit<SmsTemplateInput, "slug">, actorId: string): Promise<SmsTemplateView> {
  await assertStandaloneDataset();
  validateTemplate(input);
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ version: number }>("SELECT version FROM sms_templates WHERE id = $1 FOR UPDATE", [id]);
    if (!existing.rows[0]) throw new DomainError("The SMS template could not be found.", 404);
    const version = Number(existing.rows[0].version) + 1;
    await client.query("INSERT INTO sms_template_revisions (id, template_id, version, body, edited_by, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [randomUUID(), id, version, input.body.trim(), actorId, now]);
    await client.query("UPDATE sms_templates SET name = $2, trigger_key = $3, message_type = $4, body = $5, status = $6, version = $7, updated_at = $8 WHERE id = $1", [id, input.name.trim(), input.triggerKey.trim(), input.messageType, input.body.trim(), input.status ?? "draft", version, now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  const template = (await getSmsTemplates()).find((item) => item.id === id);
  if (!template) throw new DomainError("The SMS template was updated but could not be loaded.", 500);
  return template;
}

export function getSmsOperationalState(): { enabled: boolean; provider: string; configured: boolean } {
  const provider = process.env.SMS_PROVIDER ?? "mock";
  const enabled = process.env.SMS_ENABLED === "true";
  const configured = provider === "mock" || Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_MESSAGING_SERVICE_SID);
  return { enabled, provider, configured };
}

export async function queueSms(input: SmsQueueInput): Promise<string | null> {
  const phone = normalizeSmsPhone(input.recipientPhone);
  const database = input.client ?? getDb();
  if (!input.client) await assertStandaloneDataset();
  const templateResult = await database.query<SmsTemplateRow>("SELECT id, slug, name, trigger_key, message_type, body, status, version, updated_at FROM sms_templates WHERE slug = $1 AND status = 'active'", [input.templateSlug]);
  const template = templateResult.rows[0];
  if (!template) throw new DomainError(`The active SMS template ${input.templateSlug} is not configured.`, 500);
  if (template.message_type === "marketing") {
    const suppressed = await database.query("SELECT 1 FROM crm_contacts WHERE phone = $1 AND (sms_opted_out_at IS NOT NULL OR sms_consent = FALSE)", [phone]);
    if (suppressed.rows[0]) return null;
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  const messageBody = renderSmsTemplate(template.body, input.payload);
  await database.query(`
    INSERT INTO sms_outbox
      (id, trigger_key, recipient_phone, recipient_name, entity_type, entity_id, template_id,
       template_version, message_body, payload_json, status, attempts, scheduled_at,
       idempotency_key, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'queued', 0, $11, $12, $13)
    ON CONFLICT (idempotency_key) DO NOTHING
  `, [id, input.triggerKey, phone, input.recipientName?.trim() ?? "", input.entityType, input.entityId, template.id, template.version, messageBody, JSON.stringify(input.payload), input.scheduledAt ?? now, input.idempotencyKey, now]);
  return id;
}

type ClaimedSms = { id: string; recipient_phone: string; message_body: string };

async function claimDueSms(limit: number): Promise<ClaimedSms[]> {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<ClaimedSms>("SELECT id, recipient_phone, message_body FROM sms_outbox WHERE status = 'queued' AND scheduled_at <= $1 ORDER BY scheduled_at ASC, created_at ASC FOR UPDATE SKIP LOCKED LIMIT $2", [new Date().toISOString(), limit]);
    for (const row of rows) await client.query("UPDATE sms_outbox SET status = 'sending', attempts = attempts + 1 WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return rows;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function sendWithProvider(message: ClaimedSms): Promise<string> {
  const state = getSmsOperationalState();
  if (state.provider === "mock") return `mock-${message.id}`;
  if (state.provider !== "twilio" || !state.configured) throw new Error("SMS provider credentials are not configured.");
  const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
  const authToken = process.env.TWILIO_AUTH_TOKEN as string;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID as string;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: message.recipient_phone, MessagingServiceSid: messagingServiceSid, Body: message.message_body }),
  });
  const result = await response.json() as { sid?: string; message?: string; code?: number };
  if (!response.ok || !result.sid) throw new Error(result.message ?? `SMS provider rejected the message (${result.code ?? response.status}).`);
  return result.sid;
}

export async function processDueSms(limit = 20): Promise<SmsProcessingResult> {
  await assertStandaloneDataset();
  const state = getSmsOperationalState();
  if (!state.enabled) return { ...state, claimed: 0, sent: 0, failed: 0 };
  const claimed = await claimDueSms(limit);
  let sent = 0;
  let failed = 0;
  for (const message of claimed) {
    try {
      const providerMessageId = await sendWithProvider(message);
      await getDb().query("UPDATE sms_outbox SET status = 'sent', provider_message_id = $2, sent_at = $3, last_error = NULL WHERE id = $1", [message.id, providerMessageId, new Date().toISOString()]);
      sent += 1;
    } catch (error) {
      await getDb().query("UPDATE sms_outbox SET status = 'failed', last_error = $2 WHERE id = $1", [message.id, error instanceof Error ? error.message : "Unknown SMS provider error"]);
      failed += 1;
    }
  }
  return { ...state, claimed: claimed.length, sent, failed };
}
