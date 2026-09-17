import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import type { CrmActivityType, CrmActivityView, CrmContactView, CrmLifecycleStage, CrmNoteView, CrmTagView } from "@/lib/types";
import { DomainError } from "@/lib/errors";

export { DomainError } from "@/lib/errors";

type ContactInput = {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  source?: string;
  lifecycleStage?: CrmLifecycleStage;
  marketingConsent?: boolean;
  smsConsent?: boolean;
};

type ContactRow = DatabaseRow & {
  id: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  source: string;
  lifecycle_stage: CrmLifecycleStage;
  marketing_consent: boolean | number;
  sms_consent: boolean | number;
  sms_opted_out_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

function contactId(email: string): string {
  return `crm-contact-${Buffer.from(email).toString("hex").slice(0, 48)}`;
}

function toTag(row: { id: string; slug: string; name: string; color: string }): CrmTagView {
  return { id: row.id, slug: row.slug, name: row.name, color: row.color };
}

function toContact(row: ContactRow, tags: CrmTagView[], notes: CrmNoteView[], activities: CrmActivityView[]): CrmContactView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    company: row.company,
    source: row.source,
    lifecycleStage: row.lifecycle_stage,
    marketingConsent: Boolean(row.marketing_consent),
    smsConsent: Boolean(row.sms_consent),
    smsOptedOutAt: row.sms_opted_out_at,
    unsubscribedAt: row.unsubscribed_at,
    tags,
    notes,
    activities,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function tagsForContact(contactIdValue: string, client: Pick<DatabaseClient, "query"> = getDb()): Promise<CrmTagView[]> {
  const { rows } = await client.query<{ id: string; slug: string; name: string; color: string }>(`
    SELECT t.id, t.slug, t.name, t.color
    FROM crm_tags t
    JOIN crm_contact_tags ct ON ct.tag_id = t.id
    WHERE ct.contact_id = $1
    ORDER BY t.name ASC
  `, [contactIdValue]);
  return rows.map(toTag);
}

async function notesForContact(contactIdValue: string, client: Pick<DatabaseClient, "query"> = getDb()): Promise<CrmNoteView[]> {
  const { rows } = await client.query<{ id: string; body: string; created_by: string | null; created_at: string }>(`
    SELECT id, body, created_by, created_at
    FROM crm_notes
    WHERE contact_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [contactIdValue]);
  return rows.map((row) => ({ id: row.id, body: row.body, createdBy: row.created_by, createdAt: row.created_at }));
}

async function activitiesForContact(contactIdValue: string, client: Pick<DatabaseClient, "query"> = getDb()): Promise<CrmActivityView[]> {
  const { rows } = await client.query<{ id: string; activity_type: CrmActivityType; subject: string; body: string; entity_type: string | null; entity_id: string | null; occurred_at: string }>(`
    SELECT id, activity_type, subject, body, entity_type, entity_id, occurred_at
    FROM crm_activities
    WHERE contact_id = $1
    ORDER BY occurred_at DESC
    LIMIT 30
  `, [contactIdValue]);
  return rows.map((row) => ({ id: row.id, activityType: row.activity_type, subject: row.subject, body: row.body, entityType: row.entity_type, entityId: row.entity_id, occurredAt: row.occurred_at }));
}

export async function getCrmTags(): Promise<CrmTagView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<{ id: string; slug: string; name: string; color: string }>("SELECT id, slug, name, color FROM crm_tags ORDER BY name ASC");
  return rows.map(toTag);
}

export async function getCrmContacts(search = ""): Promise<CrmContactView[]> {
  await assertStandaloneDataset();
  const normalizedSearch = search.trim().toLowerCase();
  const { rows } = await getDb().query<ContactRow>(`
    SELECT id, email, name, phone, company, source, lifecycle_stage, marketing_consent, sms_consent, sms_opted_out_at, unsubscribed_at, created_at, updated_at
    FROM crm_contacts
    WHERE $1 = '' OR lower(email) LIKE '%' || $1 || '%' OR lower(name) LIKE '%' || $1 || '%' OR lower(company) LIKE '%' || $1 || '%'
    ORDER BY updated_at DESC, name ASC
    LIMIT 100
  `, [normalizedSearch]);
  return Promise.all(rows.map(async (row) => {
    const [tags, notes, activities] = await Promise.all([tagsForContact(row.id), notesForContact(row.id), activitiesForContact(row.id)]);
    return toContact(row, tags, notes, activities);
  }));
}

export async function getCrmContact(id: string): Promise<CrmContactView | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<ContactRow>(`
    SELECT id, email, name, phone, company, source, lifecycle_stage, marketing_consent, sms_consent, sms_opted_out_at, unsubscribed_at, created_at, updated_at
    FROM crm_contacts WHERE id = $1
  `, [id]);
  const row = rows[0];
  return row ? toContact(row, await tagsForContact(row.id), await notesForContact(row.id), await activitiesForContact(row.id)) : null;
}

export async function upsertCrmContact(input: ContactInput, actorId: string | null = null, client?: DatabaseClient): Promise<string> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) throw new DomainError("A valid contact email is required.");
  const database = client ?? getDb();
  if (!client) await assertStandaloneDataset();
  const now = new Date().toISOString();
  const id = contactId(email);
  const result = await database.query<{ id: string }>(`
    INSERT INTO crm_contacts
      (id, email, name, phone, company, source, lifecycle_stage, marketing_consent, sms_consent, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    ON CONFLICT (email) DO UPDATE SET
      name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE crm_contacts.name END,
      phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE crm_contacts.phone END,
      company = CASE WHEN EXCLUDED.company <> '' THEN EXCLUDED.company ELSE crm_contacts.company END,
      source = CASE WHEN crm_contacts.source = 'manual' THEN EXCLUDED.source ELSE crm_contacts.source END,
      lifecycle_stage = CASE WHEN crm_contacts.lifecycle_stage IN ('customer', 'inactive') THEN crm_contacts.lifecycle_stage ELSE EXCLUDED.lifecycle_stage END,
      marketing_consent = crm_contacts.marketing_consent OR EXCLUDED.marketing_consent,
      sms_consent = crm_contacts.sms_consent OR EXCLUDED.sms_consent,
      sms_opted_out_at = CASE WHEN EXCLUDED.sms_consent THEN NULL ELSE crm_contacts.sms_opted_out_at END,
      updated_at = EXCLUDED.updated_at
    RETURNING id
  `, [id, email, input.name.trim(), input.phone?.trim() ?? "", input.company?.trim() ?? "", input.source ?? "manual", input.lifecycleStage ?? "lead", input.marketingConsent ?? false, input.smsConsent ?? false, now]);
  const contact = result.rows[0]?.id ?? id;
  const tagSlug = input.lifecycleStage === "customer" ? "customer" : input.lifecycleStage === "attendee" ? "attendee" : null;
  if (tagSlug) {
    await database.query(`
      INSERT INTO crm_contact_tags (contact_id, tag_id, created_at)
      SELECT $1, id, $2 FROM crm_tags WHERE slug = $3
      ON CONFLICT (contact_id, tag_id) DO NOTHING
    `, [contact, now, tagSlug]);
  }
  if (actorId && input.source === "manual") {
    await database.query(`
      INSERT INTO crm_activities (id, contact_id, activity_type, subject, body, entity_type, entity_id, occurred_at, created_by)
      VALUES ($1, $2, 'system', 'Contact created or updated', '', 'crm_contact', $2, $3, $4)
    `, [randomUUID(), contact, now, actorId]);
  }
  return contact;
}

export async function createCrmContact(input: ContactInput, actorId: string): Promise<CrmContactView> {
  const id = await upsertCrmContact(input, actorId);
  const contact = await getCrmContact(id);
  if (!contact) throw new DomainError("The contact was created but could not be loaded.", 500);
  return contact;
}

export async function updateCrmContact(id: string, input: Partial<Pick<ContactInput, "name" | "phone" | "company" | "lifecycleStage" | "marketingConsent" | "smsConsent">> & { unsubscribed?: boolean; smsOptedOut?: boolean }, actorId: string): Promise<CrmContactView> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const result = await getDb().query(`
    UPDATE crm_contacts
    SET name = COALESCE($2, name), phone = COALESCE($3, phone), company = COALESCE($4, company),
        lifecycle_stage = COALESCE($5, lifecycle_stage), marketing_consent = COALESCE($6, marketing_consent),
        sms_consent = COALESCE($7, sms_consent),
        sms_opted_out_at = CASE WHEN $8::boolean IS NULL THEN sms_opted_out_at WHEN $8::boolean THEN $9 ELSE NULL END,
        unsubscribed_at = CASE WHEN $10::boolean IS NULL THEN unsubscribed_at WHEN $10::boolean THEN $9 ELSE NULL END,
        updated_at = $9
    WHERE id = $1
    RETURNING id
  `, [id, input.name?.trim() ?? null, input.phone?.trim() ?? null, input.company?.trim() ?? null, input.lifecycleStage ?? null, input.marketingConsent ?? null, input.smsConsent ?? null, input.smsOptedOut ?? null, now, input.unsubscribed ?? null]);
  if (result.rowCount !== 1) throw new DomainError("The contact could not be found.", 404);
  await getDb().query(`INSERT INTO crm_activities (id, contact_id, activity_type, subject, body, entity_type, entity_id, occurred_at, created_by) VALUES ($1, $2, 'system', 'Contact updated', '', 'crm_contact', $2, $3, $4)`, [randomUUID(), id, now, actorId]);
  const contact = await getCrmContact(id);
  if (!contact) throw new DomainError("The contact could not be loaded.", 500);
  return contact;
}

export async function addCrmNote(contactIdValue: string, body: string, actorId: string): Promise<CrmNoteView> {
  await assertStandaloneDataset();
  const trimmed = body.trim();
  if (trimmed.length < 2 || trimmed.length > 4000) throw new DomainError("A note must contain between 2 and 4,000 characters.");
  const now = new Date().toISOString();
  const id = randomUUID();
  const contact = await getDb().query("SELECT id FROM crm_contacts WHERE id = $1", [contactIdValue]);
  if (!contact.rows[0]) throw new DomainError("The contact could not be found.", 404);
  await getDb().query("INSERT INTO crm_notes (id, contact_id, body, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)", [id, contactIdValue, trimmed, actorId, now]);
  await getDb().query("INSERT INTO crm_activities (id, contact_id, activity_type, subject, body, entity_type, entity_id, occurred_at, created_by) VALUES ($1, $2, 'note', 'Note added', $3, 'crm_note', $4, $5, $6)", [randomUUID(), contactIdValue, trimmed, id, now, actorId]);
  return { id, body: trimmed, createdBy: actorId, createdAt: now };
}

export async function addCrmTag(contactIdValue: string, tagId: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const result = await getDb().query(`INSERT INTO crm_contact_tags (contact_id, tag_id, created_at) SELECT $1, id, $3 FROM crm_tags WHERE id = $2 ON CONFLICT (contact_id, tag_id) DO NOTHING`, [contactIdValue, tagId, now]);
  if (result.rowCount === 0) throw new DomainError("The contact or tag could not be found.", 404);
  await getDb().query("INSERT INTO crm_activities (id, contact_id, activity_type, subject, body, entity_type, entity_id, occurred_at, created_by) VALUES ($1, $2, 'system', 'Tag added', '', 'crm_tag', $3, $4, $5)", [randomUUID(), contactIdValue, tagId, now, actorId]);
}

export async function removeCrmTag(contactIdValue: string, tagId: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  await getDb().query("DELETE FROM crm_contact_tags WHERE contact_id = $1 AND tag_id = $2", [contactIdValue, tagId]);
  await getDb().query("INSERT INTO crm_activities (id, contact_id, activity_type, subject, body, entity_type, entity_id, occurred_at, created_by) VALUES ($1, $2, 'system', 'Tag removed', '', 'crm_tag', $3, $4, $5)", [randomUUID(), contactIdValue, tagId, now, actorId]);
}
