import { cache } from "react";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type {
  FormCondition,
  FormConfirmation,
  FormDefinition,
  FormEntry,
  FormEntryAuditEvent,
  FormEntryDelivery,
  FormEntryDetail,
  FormEntryFilter,
  FormEntryPaymentStatus,
  FormField,
  FormFieldOption,
  FormFieldType,
  FormMailerProvider,
  FormMailerSettings,
  FormNotification,
  FormSettings,
  FormStatus,
} from "@/lib/types";

export const FORM_FIELD_TYPES: readonly FormFieldType[] = [
  "text", "textarea", "select", "radio", "checkbox", "number", "name", "email", "range", "captcha", "consent",
  "phone", "datetime", "address", "map", "url", "layout", "page_break", "divider", "rich_text", "html", "signature", "hidden",
];

export const FORM_FIELD_GROUPS: Array<{ label: string; types: Array<{ type: FormFieldType; label: string; description: string }> }> = [
  {
    label: "Standard fields",
    types: [
      { type: "text", label: "Single-line text", description: "Short answer" },
      { type: "textarea", label: "Paragraph text", description: "Long answer" },
      { type: "select", label: "Dropdown", description: "One option" },
      { type: "radio", label: "Multiple choice", description: "One visible choice" },
      { type: "checkbox", label: "Checkboxes", description: "One or more choices" },
      { type: "number", label: "Number", description: "Numeric answer" },
      { type: "name", label: "Name", description: "First and last name" },
      { type: "email", label: "Email", description: "Email address" },
      { type: "range", label: "Number slider", description: "Bounded range" },
      { type: "captcha", label: "CAPTCHA", description: "Spam challenge hook" },
      { type: "consent", label: "GDPR / consent", description: "Explicit agreement" },
    ],
  },
  {
    label: "Advanced fields",
    types: [
      { type: "phone", label: "Phone", description: "Telephone number" },
      { type: "datetime", label: "Date and time", description: "Date/time picker" },
      { type: "address", label: "Address", description: "Address lines" },
      { type: "map", label: "Map", description: "Location query" },
      { type: "url", label: "Website URL", description: "Safe URL" },
      { type: "signature", label: "Signature", description: "Signature capture hook" },
      { type: "hidden", label: "Hidden field", description: "Non-visible value" },
    ],
  },
  {
    label: "Structure and content",
    types: [
      { type: "layout", label: "Layout", description: "Group fields visually" },
      { type: "page_break", label: "Page break", description: "Multi-step boundary" },
      { type: "divider", label: "Section divider", description: "Visual separator" },
      { type: "rich_text", label: "Rich text", description: "Formatted content" },
      { type: "html", label: "HTML", description: "Sanitized markup" },
    ],
  },
];

export const defaultFormSettings: FormSettings = {
  enableConditionalLogic: true,
  storeSpamEntries: true,
  minimumSubmitSeconds: 3,
  countryFilter: [],
  keywordFilter: [],
  captchaProvider: "none",
  aiEnabled: false,
};

export interface FormInput {
  name: string;
  slug: string;
  description: string;
  tags: string[];
  status: FormStatus;
  submitButtonText: string;
  submittingText: string;
  settings: FormSettings;
  fields: Array<Partial<FormField> & { fieldType: FormFieldType }>;
  notifications: Array<Partial<FormNotification> & { name: string }>;
  confirmation: Partial<FormConfirmation>;
}

export interface FormEntryQuery {
  filter?: FormEntryFilter;
  query?: string;
  fieldId?: string;
  operator?: "equals" | "not_equals" | "contains";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sort?: "created_at" | "entry_number" | "updated_at";
  direction?: "asc" | "desc";
}

export interface FormEntryPage {
  entries: FormEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FormSubmissionMetadata {
  startedAt?: number;
  ipAddress?: string;
  country?: string;
  userAgent?: string;
  referrer?: string;
}

export interface FormSubmissionResult {
  entryId: string;
  entryNumber: number;
  confirmation: FormConfirmation;
  values: Record<string, string | string[]>;
  spam: boolean;
}

type FormRow = DatabaseRow & {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags_json: string;
  status: FormStatus;
  submit_button_text: string;
  submitting_text: string;
  settings_json: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  entry_count?: number | string;
  unread_count?: number | string;
};

type FieldRow = DatabaseRow & {
  id: string;
  form_id: string;
  sort_order: number | string;
  field_type: FormFieldType;
  label: string;
  description: string;
  placeholder: string;
  field_id: string;
  is_required: boolean | number;
  options_json: string;
  default_value: string;
  validation_json: string;
  conditional_json: string;
  settings_json: string;
};

type NotificationRow = DatabaseRow & {
  id: string;
  form_id: string;
  sort_order: number | string;
  name: string;
  enabled: boolean | number;
  recipient_emails_json: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  message_html: string;
  condition_json: string;
  advanced_json: string;
};

type ConfirmationRow = DatabaseRow & {
  id: string;
  form_id: string;
  confirmation_type: FormConfirmation["confirmationType"];
  message_html: string;
  page_url: string;
  redirect_url: string;
  auto_scroll: boolean | number;
  entry_preview: boolean | number;
};

type EntryRow = DatabaseRow & {
  id: string;
  form_id: string;
  form_name: string;
  entry_number: number | string;
  values_json: string;
  notes: string;
  is_read: boolean | number;
  is_starred: boolean | number;
  is_spam: boolean | number;
  trashed_at: string | null;
  payment_status: FormEntryPaymentStatus;
  ip_address: string | null;
  ip_hash: string | null;
  country: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
  updated_at: string;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function primitiveRecord(value: string): Record<string, string | number | boolean> {
  const parsed = parseJson<Record<string, unknown>>(value, {});
  return Object.fromEntries(Object.entries(parsed).filter(([, item]) => ["string", "number", "boolean"].includes(typeof item))) as Record<string, string | number | boolean>;
}

function normalizeValues(value: string): Record<string, string | string[]> {
  const parsed = parseJson<Record<string, unknown>>(value, {});
  const result: Record<string, string | string[]> = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (typeof item === "string") result[key] = item;
    else if (Array.isArray(item)) result[key] = item.filter((entry): entry is string => typeof entry === "string").slice(0, 50);
    else if (typeof item === "number" || typeof item === "boolean") result[key] = String(item);
  }
  return result;
}

function normalizeCondition(value: unknown): FormCondition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.fieldId !== "string" || !item.fieldId.trim()) return null;
  const operator = ["equals", "not_equals", "contains", "not_empty"].includes(String(item.operator)) ? String(item.operator) as FormCondition["operator"] : "equals";
  return { fieldId: item.fieldId.trim().slice(0, 80), operator, value: typeof item.value === "string" ? item.value.slice(0, 500) : "" };
}

function toField(row: FieldRow): FormField {
  const options = parseJson<unknown[]>(row.options_json, []).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)).map((item) => ({ label: String(item.label ?? "").slice(0, 160), value: String(item.value ?? "").slice(0, 160) })).filter((item) => item.label && item.value);
  return {
    id: row.id,
    formId: row.form_id,
    sortOrder: Number(row.sort_order),
    fieldType: row.field_type,
    label: row.label,
    description: row.description,
    placeholder: row.placeholder,
    fieldId: row.field_id,
    isRequired: Boolean(row.is_required),
    options,
    defaultValue: row.default_value,
    validation: primitiveRecord(row.validation_json),
    conditional: normalizeCondition(parseJson<unknown>(row.conditional_json, {})),
    settings: primitiveRecord(row.settings_json),
  };
}

function toNotification(row: NotificationRow): FormNotification {
  const recipients = parseJson<unknown[]>(row.recipient_emails_json, []).filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return {
    id: row.id,
    formId: row.form_id,
    sortOrder: Number(row.sort_order),
    name: row.name,
    enabled: Boolean(row.enabled),
    recipientEmails: recipients,
    subject: row.subject,
    fromName: row.from_name,
    fromEmail: row.from_email,
    replyTo: row.reply_to,
    messageHtml: row.message_html,
    condition: normalizeCondition(parseJson<unknown>(row.condition_json, {})),
    advanced: primitiveRecord(row.advanced_json),
  };
}

function toConfirmation(row: ConfirmationRow | undefined, formId: string): FormConfirmation {
  return row ? {
    id: row.id,
    formId: row.form_id,
    confirmationType: row.confirmation_type,
    messageHtml: row.message_html,
    pageUrl: row.page_url,
    redirectUrl: row.redirect_url,
    autoScroll: Boolean(row.auto_scroll),
    entryPreview: Boolean(row.entry_preview),
  } : {
    id: `confirmation-${formId}`,
    formId,
    confirmationType: "message",
    messageHtml: "<p>Thanks — your response has been received.</p>",
    pageUrl: "",
    redirectUrl: "",
    autoScroll: true,
    entryPreview: false,
  };
}

function toSettings(value: string): FormSettings {
  const raw = parseJson<Record<string, unknown>>(value, {});
  return {
    enableConditionalLogic: raw.enableConditionalLogic !== false,
    storeSpamEntries: raw.storeSpamEntries !== false,
    minimumSubmitSeconds: typeof raw.minimumSubmitSeconds === "number" ? Math.max(0, Math.min(600, Math.round(raw.minimumSubmitSeconds))) : defaultFormSettings.minimumSubmitSeconds,
    countryFilter: Array.isArray(raw.countryFilter) ? raw.countryFilter.filter((item): item is string => typeof item === "string").map((item) => item.toUpperCase()).slice(0, 100) : [],
    keywordFilter: Array.isArray(raw.keywordFilter) ? raw.keywordFilter.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase()).slice(0, 100) : [],
    captchaProvider: ["none", "built_in", "recaptcha", "hcaptcha", "turnstile", "custom"].includes(String(raw.captchaProvider)) ? String(raw.captchaProvider) as FormSettings["captchaProvider"] : "none",
    aiEnabled: raw.aiEnabled === true,
  };
}

function toForm(row: FormRow, fields: FieldRow[], notifications: NotificationRow[], confirmation: ConfirmationRow | undefined): FormDefinition {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    tags: parseJson<unknown[]>(row.tags_json, []).filter((item): item is string => typeof item === "string").slice(0, 20),
    status: row.status,
    submitButtonText: row.submit_button_text,
    submittingText: row.submitting_text,
    settings: toSettings(row.settings_json),
    fields: fields.map(toField),
    notifications: notifications.map(toNotification),
    confirmation: toConfirmation(confirmation, row.id),
    entryCount: Number(row.entry_count ?? 0),
    unreadCount: Number(row.unread_count ?? 0),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function toEntry(row: EntryRow): FormEntry {
  return {
    id: row.id,
    formId: row.form_id,
    formName: row.form_name,
    entryNumber: Number(row.entry_number),
    values: normalizeValues(row.values_json),
    notes: row.notes,
    isRead: Boolean(row.is_read),
    isStarred: Boolean(row.is_starred),
    isSpam: Boolean(row.is_spam),
    trashedAt: row.trashed_at,
    paymentStatus: row.payment_status,
    ipAddress: row.ip_address,
    ipHash: row.ip_hash,
    country: row.country,
    userAgent: row.user_agent,
    referrer: row.referrer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAudit(row: DatabaseRow & { id: string; action: string; actor_name: string | null; metadata_json: string; created_at: string }): FormEntryAuditEvent {
  return { id: row.id, action: row.action, actorName: row.actor_name, metadata: primitiveRecord(row.metadata_json), createdAt: row.created_at };
}

function toDelivery(row: DatabaseRow & { id: string; notification_name: string | null; provider: string; recipient_email: string; status: FormEntryDelivery["status"]; error_message: string | null; attempted_at: string | null; created_at: string }): FormEntryDelivery {
  return { id: row.id, notificationName: row.notification_name, provider: row.provider, recipientEmail: row.recipient_email, status: row.status, errorMessage: row.error_message, attemptedAt: row.attempted_at, createdAt: row.created_at };
}

const formFields = `id, name, slug, description, tags_json, status, submit_button_text, submitting_text,
  settings_json, created_at, updated_at, published_at`;
const fieldFields = `id, form_id, sort_order, field_type, label, description, placeholder, field_id,
  is_required, options_json, default_value, validation_json, conditional_json, settings_json`;
const notificationFields = `id, form_id, sort_order, name, enabled, recipient_emails_json, subject,
  from_name, from_email, reply_to, message_html, condition_json, advanced_json`;
const confirmationFields = `id, form_id, confirmation_type, message_html, page_url, redirect_url, auto_scroll, entry_preview`;
const entryFields = `e.id, e.form_id, f.name AS form_name, e.entry_number, e.values_json, e.notes,
  e.is_read, e.is_starred, e.is_spam, e.trashed_at, e.payment_status, e.ip_address, e.ip_hash,
  e.country, e.user_agent, e.referrer, e.created_at, e.updated_at`;

export async function readForm(database: Pick<DatabaseClient, "query">, id: string): Promise<FormDefinition | null> {
  const formResult = await database.query<FormRow>(`SELECT ${formFields}, (SELECT COUNT(*) FROM form_entries e WHERE e.form_id = form_definitions.id AND e.trashed_at IS NULL)::int AS entry_count, (SELECT COUNT(*) FROM form_entries e WHERE e.form_id = form_definitions.id AND e.trashed_at IS NULL AND e.is_read = FALSE)::int AS unread_count FROM form_definitions WHERE id = $1`, [id]);
  const row = formResult.rows[0];
  if (!row) return null;
  const [fieldsResult, notificationsResult, confirmationResult] = await Promise.all([
    database.query<FieldRow>(`SELECT ${fieldFields} FROM form_fields WHERE form_id = $1 ORDER BY sort_order, id`, [id]),
    database.query<NotificationRow>(`SELECT ${notificationFields} FROM form_notifications WHERE form_id = $1 ORDER BY sort_order, id`, [id]),
    database.query<ConfirmationRow>(`SELECT ${confirmationFields} FROM form_confirmations WHERE form_id = $1 LIMIT 1`, [id]),
  ]);
  return toForm(row, fieldsResult.rows, notificationsResult.rows, confirmationResult.rows[0]);
}

export async function getFormById(id: string): Promise<FormDefinition | null> {
  await assertStandaloneDataset();
  return readForm(getDb(), id);
}

export async function getPublishedFormBySlug(slug: string): Promise<FormDefinition | null> {
  await assertStandaloneDataset();
  const formResult = await getDb().query<{ id: string }>("SELECT id FROM form_definitions WHERE slug = $1 AND status = 'published'", [slug.trim().toLowerCase()]);
  return formResult.rows[0] ? readForm(getDb(), formResult.rows[0].id) : null;
}

export const getForms = cache(async (filters?: { query?: string; status?: FormStatus | "all" }): Promise<FormDefinition[]> => {
  await assertStandaloneDataset();
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (filters?.query?.trim()) {
    values.push(`%${filters.query.trim()}%`);
    conditions.push(`(name ILIKE $${values.length} OR slug ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }
  if (filters?.status && filters.status !== "all") {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await getDb().query<FormRow>(`SELECT ${formFields}, (SELECT COUNT(*) FROM form_entries e WHERE e.form_id = form_definitions.id AND e.trashed_at IS NULL)::int AS entry_count, (SELECT COUNT(*) FROM form_entries e WHERE e.form_id = form_definitions.id AND e.trashed_at IS NULL AND e.is_read = FALSE)::int AS unread_count FROM form_definitions ${where} ORDER BY updated_at DESC, name`, values);
  const details = await Promise.all(rows.map(async (row) => {
    const [fieldsResult, notificationsResult, confirmationResult] = await Promise.all([
      getDb().query<FieldRow>(`SELECT ${fieldFields} FROM form_fields WHERE form_id = $1 ORDER BY sort_order, id`, [row.id]),
      getDb().query<NotificationRow>(`SELECT ${notificationFields} FROM form_notifications WHERE form_id = $1 ORDER BY sort_order, id`, [row.id]),
      getDb().query<ConfirmationRow>(`SELECT ${confirmationFields} FROM form_confirmations WHERE form_id = $1 LIMIT 1`, [row.id]),
    ]);
    return toForm(row, fieldsResult.rows, notificationsResult.rows, confirmationResult.rows[0]);
  }));
  return details;
});

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max) : "";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

function safeExternalOrLocalUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value.slice(0, 500);
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString().slice(0, 500) : "";
  } catch {
    return "";
  }
}

function primitiveSettings(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => ["string", "number", "boolean"].includes(typeof item)).slice(0, 40)) as Record<string, string | number | boolean>;
}

function normalizeField(input: Partial<FormField> & { fieldType: FormFieldType }, index: number, ids: Set<string>): FormField {
  if (!FORM_FIELD_TYPES.includes(input.fieldType)) throw new DomainError(`Field ${index + 1} uses an unsupported type.`);
  const labelDefaults: Partial<Record<FormFieldType, string>> = { text: "Text field", textarea: "Paragraph", select: "Choose one", radio: "Choose one", checkbox: "Select all that apply", number: "Number", name: "Name", email: "Email", range: "How would you rate it?", captcha: "Security check", consent: "Consent", phone: "Phone", datetime: "Date and time", address: "Address", map: "Location", url: "Website", layout: "Layout", page_break: "Continue", divider: "Section", rich_text: "Content", html: "HTML content", signature: "Signature", hidden: "Hidden value" };
  const label = clean(input.label, 160) || labelDefaults[input.fieldType] || "Field";
  const rawId = clean(input.fieldId, 80).toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  let fieldId = rawId || `${input.fieldType.replace(/[^a-z0-9]+/g, "_")}_${index + 1}`;
  while (ids.has(fieldId)) fieldId = `${fieldId}_${index + 1}`;
  ids.add(fieldId);
  const options: FormFieldOption[] = Array.isArray(input.options) ? input.options.slice(0, 50).map((option) => ({ label: clean(option?.label, 160), value: clean(option?.value, 160) })).filter((option) => option.label && option.value) : [];
  const settings = primitiveSettings(input.settings);
  if (typeof settings.content === "string") settings.content = sanitizeHtml(settings.content).slice(0, 12_000);
  const validation = primitiveSettings(input.validation);
  const conditional = normalizeCondition(input.conditional);
  const structural = ["layout", "page_break", "divider", "rich_text", "html"].includes(input.fieldType);
  return {
    id: clean(input.id, 100) || randomUUID(),
    formId: clean(input.formId, 100),
    sortOrder: Number.isInteger(input.sortOrder) ? Math.max(0, Number(input.sortOrder)) : index,
    fieldType: input.fieldType,
    label,
    description: clean(input.description, 1_000),
    placeholder: clean(input.placeholder, 300),
    fieldId,
    isRequired: structural ? false : input.isRequired === true,
    options,
    defaultValue: clean(input.defaultValue, 1_000),
    validation,
    conditional,
    settings,
  };
}

function normalizeSettings(input: Partial<FormSettings> | undefined): FormSettings {
  const source = input ?? {};
  return {
    enableConditionalLogic: source.enableConditionalLogic !== false,
    storeSpamEntries: source.storeSpamEntries !== false,
    minimumSubmitSeconds: Number.isFinite(source.minimumSubmitSeconds) ? Math.max(0, Math.min(600, Math.round(Number(source.minimumSubmitSeconds)))) : defaultFormSettings.minimumSubmitSeconds,
    countryFilter: Array.isArray(source.countryFilter) ? Array.from(new Set(source.countryFilter.map((item) => clean(item, 2).toUpperCase()).filter((item) => /^[A-Z]{2}$/.test(item)))).slice(0, 100) : [],
    keywordFilter: Array.isArray(source.keywordFilter) ? Array.from(new Set(source.keywordFilter.map((item) => clean(item, 80).toLowerCase()).filter(Boolean))).slice(0, 100) : [],
    captchaProvider: ["none", "built_in", "recaptcha", "hcaptcha", "turnstile", "custom"].includes(String(source.captchaProvider)) ? String(source.captchaProvider) as FormSettings["captchaProvider"] : "none",
    aiEnabled: source.aiEnabled === true,
  };
}

function normalizeNotification(input: Partial<FormNotification> & { name: string }, formId: string, index: number): FormNotification {
  const recipients = Array.isArray(input.recipientEmails) ? input.recipientEmails.map((value) => clean(value, 254).toLowerCase()).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)).slice(0, 20) : [];
  const fromEmail = clean(input.fromEmail, 254).toLowerCase();
  const replyTo = clean(input.replyTo, 254).toLowerCase();
  for (const email of [fromEmail, replyTo].filter(Boolean)) if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError(`Notification ${index + 1} has an invalid email address.`);
  return {
    id: clean(input.id, 100) || randomUUID(),
    formId,
    sortOrder: index,
    name: clean(input.name, 120) || `Notification ${index + 1}`,
    enabled: input.enabled !== false,
    recipientEmails: recipients,
    subject: clean(input.subject, 240) || "New form submission: {{form_name}}",
    fromName: clean(input.fromName, 160),
    fromEmail,
    replyTo,
    messageHtml: sanitizeHtml(clean(input.messageHtml, 30_000) || "<p>A new submission was received.</p>"),
    condition: normalizeCondition(input.condition),
    advanced: primitiveSettings(input.advanced),
  };
}

function normalizeConfirmation(input: Partial<FormConfirmation>, formId: string): FormConfirmation {
  const confirmationType = ["message", "page", "url"].includes(String(input.confirmationType)) ? String(input.confirmationType) as FormConfirmation["confirmationType"] : "message";
  return {
    id: clean(input.id, 100) || randomUUID(),
    formId,
    confirmationType,
    messageHtml: sanitizeHtml(clean(input.messageHtml, 30_000) || "<p>Thanks — your response has been received.</p>"),
    pageUrl: safeExternalOrLocalUrl(clean(input.pageUrl, 500)),
    redirectUrl: safeExternalOrLocalUrl(clean(input.redirectUrl, 500)),
    autoScroll: input.autoScroll !== false,
    entryPreview: input.entryPreview === true,
  };
}

export function normalizeFormInput(input: FormInput, formId: string = randomUUID()): { formId: string; name: string; slug: string; description: string; tags: string[]; status: FormStatus; submitButtonText: string; submittingText: string; settings: FormSettings; fields: FormField[]; notifications: FormNotification[]; confirmation: FormConfirmation } {
  const name = clean(input.name, 140);
  if (name.length < 2) throw new DomainError("A form name is required.");
  const slug = slugify(clean(input.slug, 100) || name);
  if (!slug) throw new DomainError("Choose a valid form slug.");
  if (!["draft", "published", "archived"].includes(input.status)) throw new DomainError("Choose a valid form status.");
  const fields: FormField[] = [];
  const ids = new Set<string>();
  for (const [index, field] of (Array.isArray(input.fields) ? input.fields : []).slice(0, 100).entries()) fields.push(normalizeField(field, index, ids));
  const notifications = (Array.isArray(input.notifications) ? input.notifications : []).slice(0, 20).map((notification, index) => normalizeNotification(notification, formId, index));
  if (notifications.length === 0) notifications.push(normalizeNotification({ name: "Admin notification", recipientEmails: [] }, formId, 0));
  return {
    formId,
    name,
    slug,
    description: clean(input.description, 2_000),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => clean(tag, 40)).filter(Boolean).slice(0, 20) : [],
    status: input.status,
    submitButtonText: clean(input.submitButtonText, 80) || "Submit",
    submittingText: clean(input.submittingText, 80) || "Sending…",
    settings: normalizeSettings(input.settings),
    fields,
    notifications,
    confirmation: normalizeConfirmation(input.confirmation ?? {}, formId),
  };
}

export async function insertFormParts(client: DatabaseClient, form: ReturnType<typeof normalizeFormInput>, now: string): Promise<void> {
  for (const [index, field] of form.fields.entries()) {
    await client.query(`INSERT INTO form_fields (id, form_id, sort_order, field_type, label, description, placeholder, field_id, is_required, options_json, default_value, validation_json, conditional_json, settings_json, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)`, [field.id, form.formId, index, field.fieldType, field.label, field.description, field.placeholder, field.fieldId, field.isRequired, JSON.stringify(field.options), field.defaultValue, JSON.stringify(field.validation), JSON.stringify(field.conditional ?? {}), JSON.stringify(field.settings), now]);
  }
  for (const [index, notification] of form.notifications.entries()) {
    await client.query(`INSERT INTO form_notifications (id, form_id, sort_order, name, enabled, recipient_emails_json, subject, from_name, from_email, reply_to, message_html, condition_json, advanced_json, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`, [notification.id, form.formId, index, notification.name, notification.enabled, JSON.stringify(notification.recipientEmails), notification.subject, notification.fromName, notification.fromEmail, notification.replyTo, notification.messageHtml, JSON.stringify(notification.condition ?? {}), JSON.stringify(notification.advanced), now]);
  }
  const confirmation = form.confirmation;
  await client.query(`INSERT INTO form_confirmations (id, form_id, confirmation_type, message_html, page_url, redirect_url, auto_scroll, entry_preview, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`, [confirmation.id, form.formId, confirmation.confirmationType, confirmation.messageHtml, confirmation.pageUrl, confirmation.redirectUrl, confirmation.autoScroll, confirmation.entryPreview, now]);
}

export async function createForm(input: FormInput, actorId: string): Promise<FormDefinition> {
  await assertStandaloneDataset();
  const form = normalizeFormInput(input, randomUUID());
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO form_definitions (id, name, slug, description, tags_json, status, submit_button_text, submitting_text, settings_json, created_by, updated_by, created_at, updated_at, published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$11,$12)`, [form.formId, form.name, form.slug, form.description, JSON.stringify(form.tags), form.status, form.submitButtonText, form.submittingText, JSON.stringify(form.settings), actorId, now, form.status === "published" ? now : null]);
    await insertFormParts(client, form, now);
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'form.created','form_definition',$3,$4,$5)", [randomUUID(), actorId, form.formId, JSON.stringify({ synthetic: true, fieldCount: form.fields.length }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("That form slug is already in use.");
    throw error;
  } finally {
    client.release();
  }
  const result = await getFormById(form.formId);
  if (!result) throw new Error("The new form could not be reloaded.");
  return result;
}

export async function updateForm(id: string, input: FormInput, actorId: string): Promise<FormDefinition> {
  await assertStandaloneDataset();
  const form = normalizeFormInput(input, id);
  const now = new Date().toISOString();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ id: string; published_at: string | null }>("SELECT id, published_at FROM form_definitions WHERE id = $1 FOR UPDATE", [id]);
    if (!current.rows[0]) throw new DomainError("Form not found.", 404);
    await client.query(`UPDATE form_definitions SET name=$1, slug=$2, description=$3, tags_json=$4, status=$5, submit_button_text=$6, submitting_text=$7, settings_json=$8, updated_by=$9, updated_at=$10, published_at=$11 WHERE id=$12`, [form.name, form.slug, form.description, JSON.stringify(form.tags), form.status, form.submitButtonText, form.submittingText, JSON.stringify(form.settings), actorId, now, form.status === "published" ? current.rows[0].published_at ?? now : null, id]);
    await client.query("DELETE FROM form_fields WHERE form_id = $1", [id]);
    await client.query("DELETE FROM form_notifications WHERE form_id = $1", [id]);
    await client.query("DELETE FROM form_confirmations WHERE form_id = $1", [id]);
    await insertFormParts(client, form, now);
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'form.updated','form_definition',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, fieldCount: form.fields.length }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof DomainError) throw error;
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("That form slug is already in use.");
    throw error;
  } finally {
    client.release();
  }
  const result = await getFormById(id);
  if (!result) throw new Error("The updated form could not be reloaded.");
  return result;
}

export async function archiveForm(id: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const result = await getDb().query("UPDATE form_definitions SET status='archived', updated_by=$1, updated_at=$2 WHERE id=$3 AND status <> 'archived'", [actorId, now, id]);
  if (!result.rowCount) throw new DomainError("Form not found or already archived.", 404);
  await getDb().query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'form.archived','form_definition',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true }), now]);
}

function entryConditions(query: FormEntryQuery, values: unknown[]): string[] {
  const conditions: string[] = [];
  const filter = query.filter ?? "all";
  if (filter === "trash") conditions.push("e.trashed_at IS NOT NULL");
  else {
    conditions.push("e.trashed_at IS NULL");
    if (filter === "unread") conditions.push("e.is_read = FALSE");
    if (filter === "starred") conditions.push("e.is_starred = TRUE");
    if (filter === "spam") conditions.push("e.is_spam = TRUE");
    if (filter === "payments") conditions.push("e.payment_status <> 'none'");
  }
  const text = query.query?.trim();
  if (text) {
    values.push(`%${text}%`);
    const n = values.length;
    conditions.push(`(e.id ILIKE $${n} OR e.entry_number::text ILIKE $${n} OR e.notes ILIKE $${n} OR COALESCE(e.ip_address, '') ILIKE $${n} OR COALESCE(e.ip_hash, '') ILIKE $${n} OR e.values_json ILIKE $${n})`);
  }
  if (query.fieldId?.trim() && text) {
    const fieldIndex = values.length + 1;
    values.push(query.fieldId.trim().slice(0, 80));
    const valueIndex = values.length + 1;
    values.push(query.operator === "contains" ? `%${text}%` : text);
    const expression = `(e.values_json::jsonb ->> $${fieldIndex})`;
    if (query.operator === "not_equals") conditions.push(`${expression} IS DISTINCT FROM $${valueIndex}`);
    else if (query.operator === "contains") conditions.push(`${expression} ILIKE $${valueIndex}`);
    else conditions.push(`${expression} = $${valueIndex}`);
  }
  if (query.dateFrom) {
    values.push(query.dateFrom);
    conditions.push(`e.created_at >= $${values.length}`);
  }
  if (query.dateTo) {
    values.push(query.dateTo);
    conditions.push(`e.created_at < $${values.length}`);
  }
  return conditions;
}

export async function getFormEntries(formId: string, query: FormEntryQuery = {}): Promise<FormEntryPage> {
  await assertStandaloneDataset();
  const pageSize = Math.max(10, Math.min(100, Math.round(query.pageSize ?? 25)));
  const page = Math.max(1, Math.round(query.page ?? 1));
  const values: unknown[] = [formId];
  const conditions = ["e.form_id = $1", ...entryConditions(query, values)];
  const where = conditions.join(" AND ");
  const sort = ["created_at", "entry_number", "updated_at"].includes(query.sort ?? "") ? query.sort : "created_at";
  const direction = query.direction === "asc" ? "ASC" : "DESC";
  const count = await getDb().query<{ total: number | string }>(`SELECT COUNT(*)::int AS total FROM form_entries e WHERE ${where}`, values);
  const total = Number(count.rows[0]?.total ?? 0);
  const offset = (page - 1) * pageSize;
  const listValues = [...values, pageSize, offset];
  const { rows } = await getDb().query<EntryRow>(`SELECT ${entryFields} FROM form_entries e JOIN form_definitions f ON f.id = e.form_id WHERE ${where} ORDER BY e.${sort} ${direction}, e.id ${direction} LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`, listValues);
  return { entries: rows.map(toEntry), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getFormEntryDetail(formId: string, entryId: string): Promise<FormEntryDetail | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<EntryRow>(`SELECT ${entryFields} FROM form_entries e JOIN form_definitions f ON f.id=e.form_id WHERE e.form_id=$1 AND e.id=$2`, [formId, entryId]);
  const row = rows[0];
  if (!row) return null;
  const [fieldsResult, auditResult, deliveryResult, neighborsResult] = await Promise.all([
    getDb().query<{ field_id: string; label: string }>("SELECT field_id, label FROM form_fields WHERE form_id = $1 ORDER BY sort_order", [formId]),
    getDb().query<DatabaseRow & { id: string; action: string; actor_name: string | null; metadata_json: string; created_at: string }>("SELECT a.id, a.action, u.name AS actor_name, a.metadata_json, a.created_at FROM form_entry_audit a LEFT JOIN users u ON u.id=a.actor_id WHERE a.entry_id=$1 ORDER BY a.created_at DESC", [entryId]),
    getDb().query<DatabaseRow & { id: string; notification_name: string | null; provider: string; recipient_email: string; status: FormEntryDelivery["status"]; error_message: string | null; attempted_at: string | null; created_at: string }>("SELECT d.id, n.name AS notification_name, d.provider, d.recipient_email, d.status, d.error_message, d.attempted_at, d.created_at FROM form_entry_delivery d LEFT JOIN form_notifications n ON n.id=d.notification_id WHERE d.entry_id=$1 ORDER BY d.created_at DESC", [entryId]),
    getDb().query<{ id: string }>("SELECT id FROM form_entries WHERE form_id=$1 AND trashed_at IS NULL ORDER BY created_at DESC, id DESC", [formId]),
  ]);
  const entry = toEntry(row);
  const neighborIds = neighborsResult.rows.map((item) => item.id);
  const index = neighborIds.indexOf(entryId);
  return {
    ...entry,
    fieldLabels: Object.fromEntries(fieldsResult.rows.map((field) => [field.field_id, field.label])),
    audit: auditResult.rows.map(toAudit),
    deliveries: deliveryResult.rows.map(toDelivery),
    previousId: index > 0 ? neighborIds[index - 1] ?? null : null,
    nextId: index >= 0 && index < neighborIds.length - 1 ? neighborIds[index + 1] ?? null : null,
  };
}

export async function updateFormEntry(entryId: string, input: { isRead?: boolean; isStarred?: boolean; isSpam?: boolean; notes?: string; paymentStatus?: FormEntryPaymentStatus }, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const current = await getDb().query<{ is_read: boolean | number; is_starred: boolean | number; is_spam: boolean | number; notes: string; payment_status: FormEntryPaymentStatus }>("SELECT is_read, is_starred, is_spam, notes, payment_status FROM form_entries WHERE id=$1", [entryId]);
  if (!current.rows[0]) throw new DomainError("Entry not found.", 404);
  const next = { isRead: input.isRead ?? Boolean(current.rows[0].is_read), isStarred: input.isStarred ?? Boolean(current.rows[0].is_starred), isSpam: input.isSpam ?? Boolean(current.rows[0].is_spam), notes: input.notes === undefined ? current.rows[0].notes : clean(input.notes, 10_000), paymentStatus: input.paymentStatus ?? current.rows[0].payment_status };
  if (!["none", "pending", "paid", "refunded"].includes(next.paymentStatus)) throw new DomainError("Choose a valid payment status.");
  const now = new Date().toISOString();
  await getDb().query("UPDATE form_entries SET is_read=$1, is_starred=$2, is_spam=$3, notes=$4, payment_status=$5, updated_at=$6 WHERE id=$7", [next.isRead, next.isStarred, next.isSpam, next.notes, next.paymentStatus, now, entryId]);
  const actions: string[] = [];
  if (next.isRead !== Boolean(current.rows[0].is_read)) actions.push(next.isRead ? "marked_read" : "marked_unread");
  if (next.isStarred !== Boolean(current.rows[0].is_starred)) actions.push(next.isStarred ? "starred" : "unstarred");
  if (next.isSpam !== Boolean(current.rows[0].is_spam)) actions.push(next.isSpam ? "marked_spam" : "unmarked_spam");
  if (next.notes !== current.rows[0].notes) actions.push("note_updated");
  if (next.paymentStatus !== current.rows[0].payment_status) actions.push("payment_status_updated");
  for (const action of actions) await getDb().query("INSERT INTO form_entry_audit (id, entry_id, action, actor_id, metadata_json, created_at) VALUES ($1,$2,$3,$4,$5,$6)", [randomUUID(), entryId, action, actorId, JSON.stringify({ synthetic: true }), now]);
}

export async function trashFormEntry(entryId: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const result = await getDb().query("UPDATE form_entries SET trashed_at=$1, updated_at=$1 WHERE id=$2 AND trashed_at IS NULL", [now, entryId]);
  if (!result.rowCount) throw new DomainError("Entry not found or already in the trash.", 404);
  await getDb().query("INSERT INTO form_entry_audit (id, entry_id, action, actor_id, metadata_json, created_at) VALUES ($1,$2,'trashed',$3,$4,$5)", [randomUUID(), entryId, actorId, JSON.stringify({ synthetic: true }), now]);
}

export async function restoreFormEntry(entryId: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const result = await getDb().query("UPDATE form_entries SET trashed_at=NULL, updated_at=$1 WHERE id=$2 AND trashed_at IS NOT NULL", [now, entryId]);
  if (!result.rowCount) throw new DomainError("Entry is not in the trash.", 404);
  await getDb().query("INSERT INTO form_entry_audit (id, entry_id, action, actor_id, metadata_json, created_at) VALUES ($1,$2,'restored',$3,$4,$5)", [randomUUID(), entryId, actorId, JSON.stringify({ synthetic: true }), now]);
}

export async function deleteFormEntry(entryId: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const current = await getDb().query<{ trashed_at: string | null }>("SELECT trashed_at FROM form_entries WHERE id=$1", [entryId]);
  if (!current.rows[0]) throw new DomainError("Entry not found.", 404);
  if (!current.rows[0].trashed_at) throw new DomainError("Move the entry to the trash before permanently deleting it.", 409);
  await getDb().query("DELETE FROM form_entries WHERE id=$1", [entryId]);
  await getDb().query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'form_entry.deleted','form_entry',$3,$4,$5)", [randomUUID(), actorId, entryId, JSON.stringify({ synthetic: true, permanent: true }), new Date().toISOString()]);
}

function matchesCondition(condition: FormCondition | null, values: Record<string, string | string[]>): boolean {
  if (!condition) return true;
  const raw = values[condition.fieldId];
  const current = Array.isArray(raw) ? raw.join(", ") : raw ?? "";
  if (condition.operator === "not_empty") return current.trim().length > 0;
  if (condition.operator === "contains") return current.toLowerCase().includes(condition.value.toLowerCase());
  if (condition.operator === "not_equals") return current.toLowerCase() !== condition.value.toLowerCase();
  return current.toLowerCase() === condition.value.toLowerCase();
}

function normalizeSubmissionValue(value: unknown): string | string[] | undefined {
  if (typeof value === "string") return clean(value, 10_000);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => clean(item, 500)).slice(0, 50);
  return undefined;
}

function maskIp(value: string | undefined): string | null {
  if (!value) return null;
  const candidate = value.split(",")[0]?.trim() ?? "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(candidate)) return `${candidate.split(".").slice(0, 2).join(".")}.0.0`;
  if (candidate.includes(":")) return `${candidate.split(":").slice(0, 4).join(":")}::`;
  return null;
}

function validateSubmission(form: FormDefinition, rawValues: Record<string, unknown>): { values: Record<string, string | string[]>; spam: boolean } {
  const values: Record<string, string | string[]> = {};
  let spam = false;
  for (const field of form.fields) {
    if (["layout", "page_break", "divider", "rich_text", "html"].includes(field.fieldType)) continue;
    const visible = form.settings.enableConditionalLogic ? matchesCondition(field.conditional, values) : true;
    const value = normalizeSubmissionValue(rawValues[field.fieldId]);
    if (visible && field.isRequired && (!value || (Array.isArray(value) ? value.length === 0 : !value.trim()))) throw new DomainError(`${field.label} is required.`);
    if (value !== undefined) values[field.fieldId] = value;
    const text = Array.isArray(value) ? value.join(" ") : value ?? "";
    if (field.fieldType === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new DomainError("Enter a valid email address.");
    if (field.fieldType === "url" && text && !/^https:\/\//i.test(text)) throw new DomainError("Website URLs must use HTTPS.");
    if (field.fieldType === "number" || field.fieldType === "range") {
      if (text && !Number.isFinite(Number(text))) throw new DomainError(`${field.label} must be a number.`);
      const min = typeof field.validation.min === "number" ? field.validation.min : undefined;
      const max = typeof field.validation.max === "number" ? field.validation.max : undefined;
      if (min !== undefined && text && Number(text) < min) throw new DomainError(`${field.label} is below its minimum.`);
      if (max !== undefined && text && Number(text) > max) throw new DomainError(`${field.label} is above its maximum.`);
    }
  }
  const searchable = Object.values(values).flatMap((value) => Array.isArray(value) ? value : [value]).join(" ").toLowerCase();
  if (form.settings.keywordFilter.some((keyword) => searchable.includes(keyword))) spam = true;
  return { values, spam };
}

export async function submitForm(slug: string, rawValues: Record<string, unknown>, metadata: FormSubmissionMetadata = {}): Promise<FormSubmissionResult> {
  const form = await getPublishedFormBySlug(slug);
  if (!form) throw new DomainError("That form is not available.", 404);
  const validated = validateSubmission(form, rawValues);
  const elapsed = metadata.startedAt ? (Date.now() - metadata.startedAt) / 1_000 : form.settings.minimumSubmitSeconds;
  let spam = validated.spam || elapsed < form.settings.minimumSubmitSeconds;
  const country = clean(metadata.country, 2).toUpperCase();
  if (country && form.settings.countryFilter.includes(country)) spam = true;
  if (form.settings.captchaProvider !== "none") {
    const captcha = form.fields.find((field) => field.fieldType === "captcha");
    if (captcha && !validated.values[captcha.fieldId]) spam = true;
  }
  if (spam && !form.settings.storeSpamEntries) throw new DomainError("We could not verify this submission. Please try again.", 400);
  const database = getDb();
  const client = await database.connect();
  const now = new Date().toISOString();
  const entryId = randomUUID();
  let entryNumber = 0;
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM form_definitions WHERE id=$1 FOR UPDATE", [form.id]);
    const numberResult = await client.query<{ next_number: number | string }>("SELECT COALESCE(MAX(entry_number), 0)::int + 1 AS next_number FROM form_entries WHERE form_id=$1", [form.id]);
    entryNumber = Number(numberResult.rows[0]?.next_number ?? 1);
    const ipAddress = maskIp(metadata.ipAddress);
    const ipHash = metadata.ipAddress ? hashToken(metadata.ipAddress) : null;
    await client.query(`INSERT INTO form_entries (id, form_id, entry_number, values_json, is_read, is_starred, is_spam, payment_status, ip_address, ip_hash, country, user_agent, referrer, created_at, updated_at) VALUES ($1,$2,$3,$4,FALSE,FALSE,$5,'none',$6,$7,$8,$9,$10,$11,$11)`, [entryId, form.id, entryNumber, JSON.stringify(validated.values), spam, ipAddress, ipHash, country || null, clean(metadata.userAgent, 500) || null, safeExternalOrLocalUrl(clean(metadata.referrer, 500)) || null, now]);
    await client.query("INSERT INTO form_entry_audit (id, entry_id, action, actor_id, metadata_json, created_at) VALUES ($1,$2,'created',NULL,$3,$4)", [randomUUID(), entryId, JSON.stringify({ synthetic: true, spam }), now]);
    for (const notification of form.notifications) {
      if (!notification.enabled || !matchesCondition(notification.condition, validated.values)) continue;
      for (const recipient of notification.recipientEmails) {
        await client.query("INSERT INTO form_entry_delivery (id, entry_id, notification_id, provider, recipient_email, status, created_at) VALUES ($1,$2,$3,'local','' || $4,'queued',$5)", [randomUUID(), entryId, notification.id, recipient, now]);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return { entryId, entryNumber, confirmation: form.confirmation, values: validated.values, spam };
}

export async function resendFormNotifications(entryId: string, actorId: string): Promise<{ queued: number; message: string }> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<{ form_id: string }>("SELECT form_id FROM form_entries WHERE id=$1", [entryId]);
  if (!rows[0]) throw new DomainError("Entry not found.", 404);
  return resendFormNotificationsForForm(rows[0].form_id, entryId, actorId);
}

async function resendFormNotificationsForForm(formId: string, entryId: string, actorId: string): Promise<{ queued: number; message: string }> {
  const form = await getFormById(formId);
  if (!form) throw new DomainError("Form not found.", 404);
  const detail = await getFormEntryDetail(formId, entryId);
  if (!detail) throw new DomainError("Entry not found.", 404);
  const now = new Date().toISOString();
  let queued = 0;
  for (const notification of form.notifications) {
    if (!notification.enabled) continue;
    for (const recipient of notification.recipientEmails) {
      await getDb().query("INSERT INTO form_entry_delivery (id, entry_id, notification_id, provider, recipient_email, status, created_at) VALUES ($1,$2,$3,'local',$4,'queued',$5)", [randomUUID(), entryId, notification.id, recipient, now]);
      queued += 1;
    }
  }
  await getDb().query("INSERT INTO form_entry_audit (id, entry_id, action, actor_id, metadata_json, created_at) VALUES ($1,$2,'notifications_queued',$3,$4,$5)", [randomUUID(), entryId, actorId, JSON.stringify({ synthetic: true, queued }), now]);
  return { queued, message: queued > 0 ? "Notification jobs queued in the local delivery log. No external email was sent." : "No enabled notification has a recipient yet." };
}

type MailerRow = DatabaseRow & { primary_provider: FormMailerProvider; backup_provider: FormMailerProvider | null; from_name: string; from_email: string; force_from: boolean | number; settings_json: string; secrets_ciphertext: string; last_tested_at: string | null; updated_at: string };
const mailerSecretFields = new Set(["apiKey", "apiToken", "password", "smtpPassword", "clientSecret", "privateKey", "webhookSecret"]);

function mailerKey(): Buffer {
  const source = process.env.INTEGRATION_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!source || source.length < 32) throw new DomainError("Set INTEGRATION_ENCRYPTION_KEY or a 32-character SESSION_SECRET before saving mailer secrets.", 503);
  return createHash("sha256").update(source).digest();
}

function encryptMailerSecrets(value: Record<string, string>): string {
  if (Object.keys(value).length === 0) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", mailerKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptMailerSecrets(value: string): Record<string, string> {
  if (!value) return {};
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    const decipher = createDecipheriv("aes-256-gcm", mailerKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(decrypted);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.fromEntries(Object.entries(parsed).filter(([, item]) => typeof item === "string")) as Record<string, string> : {};
  } catch {
    throw new DomainError("Saved mailer secrets could not be decrypted. Check the integration encryption key.", 503);
  }
}

function toMailer(row: MailerRow, secrets: Record<string, string>): FormMailerSettings {
  return { primaryProvider: row.primary_provider, backupProvider: row.backup_provider, fromName: row.from_name, fromEmail: row.from_email, forceFrom: Boolean(row.force_from), settings: primitiveRecord(row.settings_json), lastTestedAt: row.last_tested_at, savedSecrets: Object.keys(secrets), updatedAt: row.updated_at };
}

async function readMailerRow(database: Pick<DatabaseClient, "query">): Promise<MailerRow | null> {
  const { rows } = await database.query<MailerRow>("SELECT primary_provider, backup_provider, from_name, from_email, force_from, settings_json, secrets_ciphertext, last_tested_at, updated_at FROM form_mailer_settings WHERE id='default'");
  return rows[0] ?? null;
}

export async function getFormMailerSettings(): Promise<FormMailerSettings> {
  await assertStandaloneDataset();
  const row = await readMailerRow(getDb());
  if (!row) return { primaryProvider: "native", backupProvider: null, fromName: "", fromEmail: "", forceFrom: false, settings: {}, lastTestedAt: null, savedSecrets: [], updatedAt: "" };
  return toMailer(row, decryptMailerSecrets(row.secrets_ciphertext));
}

export interface FormMailerInput {
  primaryProvider: FormMailerProvider;
  backupProvider: FormMailerProvider | null;
  fromName: string;
  fromEmail: string;
  forceFrom: boolean;
  settings: Record<string, string | number | boolean>;
  secrets: Record<string, string>;
  clearSecrets?: string[];
}

const mailerProviders: FormMailerProvider[] = ["native", "smtp", "brevo", "mailjet", "sendgrid", "gmail", "resend", "mailgun", "ses", "postmark"];

export async function updateFormMailerSettings(input: FormMailerInput, actorId: string): Promise<FormMailerSettings> {
  await assertStandaloneDataset();
  if (!mailerProviders.includes(input.primaryProvider) || (input.backupProvider && !mailerProviders.includes(input.backupProvider))) throw new DomainError("Choose a supported mailer provider.");
  const fromEmail = clean(input.fromEmail, 254).toLowerCase();
  if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) throw new DomainError("Enter a valid sender email address.");
  const database = getDb();
  const current = await readMailerRow(database);
  const previous = current ? decryptMailerSecrets(current.secrets_ciphertext) : {};
  const secrets = { ...previous };
  for (const key of input.clearSecrets ?? []) delete secrets[clean(key, 80)];
  for (const [key, value] of Object.entries(input.secrets ?? {})) if (mailerSecretFields.has(key) && clean(value, 20_000)) secrets[key] = clean(value, 20_000);
  const settings = primitiveSettings(input.settings);
  const now = new Date().toISOString();
  await database.query(`UPDATE form_mailer_settings SET primary_provider=$1, backup_provider=$2, from_name=$3, from_email=$4, force_from=$5, settings_json=$6, secrets_ciphertext=$7, updated_by=$8, updated_at=$9 WHERE id='default'`, [input.primaryProvider, input.backupProvider, clean(input.fromName, 160), fromEmail, input.forceFrom === true, JSON.stringify(settings), encryptMailerSecrets(secrets), actorId, now]);
  await database.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'form_mailer.updated','form_mailer_settings','default',$3,$4)", [randomUUID(), actorId, JSON.stringify({ synthetic: true, primaryProvider: input.primaryProvider, secretValuesExcluded: true }), now]);
  const row = await readMailerRow(database);
  if (!row) throw new DomainError("The mailer settings could not be loaded after saving.", 500);
  return toMailer(row, decryptMailerSecrets(row.secrets_ciphertext));
}

export async function testFormMailer(actorId: string): Promise<{ status: "skipped"; message: string; testedAt: string }> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  await getDb().query("UPDATE form_mailer_settings SET last_tested_at=$1, updated_by=$2, updated_at=$1 WHERE id='default'", [now, actorId]);
  await getDb().query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'form_mailer.tested','form_mailer_settings','default',$3,$4)", [randomUUID(), actorId, JSON.stringify({ synthetic: true, externalDelivery: false }), now]);
  return { status: "skipped", message: "Local-safe mailer test recorded. No external email was sent.", testedAt: now };
}
