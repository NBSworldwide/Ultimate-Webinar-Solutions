import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { DatabaseClient } from "@/lib/db";
import { insertFormParts, normalizeFormInput, type FormInput } from "@/lib/forms";

const SAMPLE_SEED_VERSION = "synthetic-v1";
const STUDIO_SAMPLE_SEED_VERSION = "studio-v1";

function isoFromNow(days: number, hour: number): string {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}

export async function seedSyntheticSamples(): Promise<{ webinars: number; registrations: number; alreadySeeded: boolean }> {
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await seedWithinTransaction(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function seedStudioSamples(): Promise<{ forms: number; media: number; entries: number; alreadySeeded: boolean }> {
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await seedStudioWithinTransaction(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function seedStudioWithinTransaction(client: DatabaseClient): Promise<{ forms: number; media: number; entries: number; alreadySeeded: boolean }> {
  const metadataResult = await client.query<{ key: string; value: string }>("SELECT key, value FROM system_metadata WHERE key IN ('dataset_origin', 'original_data_imported', 'studio_seed_version')");
  const metadata = new Map(metadataResult.rows.map((row) => [row.key, row.value]));
  if (metadata.get("studio_seed_version") === STUDIO_SAMPLE_SEED_VERSION) {
    const counts = await client.query<{ forms: number; media: number; entries: number }>(`
      SELECT (SELECT COUNT(*) FROM form_definitions)::int AS forms,
        (SELECT COUNT(*) FROM media_assets)::int AS media,
        (SELECT COUNT(*) FROM form_entries)::int AS entries
    `);
    return { ...counts.rows[0], alreadySeeded: true };
  }
  if (metadata.get("dataset_origin") !== "standalone" || metadata.get("original_data_imported") !== "false") {
    throw new Error("Refusing to seed studio fixtures outside the marked standalone synthetic dataset.");
  }
  const existing = await client.query<{ forms: number; media: number; entries: number }>(`
    SELECT (SELECT COUNT(*) FROM form_definitions)::int AS forms,
      (SELECT COUNT(*) FROM media_assets)::int AS media,
      (SELECT COUNT(*) FROM form_entries)::int AS entries
  `);
  if (Number(existing.rows[0].forms) || Number(existing.rows[0].media) || Number(existing.rows[0].entries)) {
    throw new Error("Refusing to add studio fixtures to a database that already contains studio records without a studio seed marker.");
  }

  const now = new Date().toISOString();
  const formInputs: Array<{ id: string; input: FormInput }> = [
    {
      id: "form-session-request",
      input: {
        name: "Session request",
        slug: "session-request",
        description: "A short intake form for teams asking for a tailored webinar session.",
        tags: ["lead", "webinar"],
        status: "published",
        submitButtonText: "Send request",
        submittingText: "Sending request…",
        settings: { enableConditionalLogic: true, storeSpamEntries: true, minimumSubmitSeconds: 2, countryFilter: [], keywordFilter: [], captchaProvider: "built_in", aiEnabled: false },
        fields: [
          { fieldType: "name", fieldId: "name", label: "Your name", placeholder: "Avery Jordan", isRequired: true },
          { fieldType: "email", fieldId: "email", label: "Work email", placeholder: "avery@example.com", isRequired: true },
          { fieldType: "page_break", fieldId: "context", label: "Session context" },
          { fieldType: "select", fieldId: "topic", label: "What would you like to discuss?", options: [{ label: "Operations readiness", value: "operations" }, { label: "Leadership practice", value: "leadership" }, { label: "Custom workshop", value: "custom" }], isRequired: true },
          { fieldType: "textarea", fieldId: "message", label: "Tell us a little more", placeholder: "What would make the session useful?", isRequired: true },
          { fieldType: "consent", fieldId: "consent", label: "I agree to be contacted about this request.", isRequired: true },
        ],
        notifications: [{ name: "Studio team", enabled: true, recipientEmails: ["studio@webinar.local"], subject: "New session request from {{name}}", fromName: "Webinar Studio", fromEmail: "studio@webinar.local", replyTo: "studio@webinar.local", messageHtml: "<p>A new session request is ready for review.</p>" }],
        confirmation: { confirmationType: "message", messageHtml: "<p>Thanks — your request is in the queue. The studio team will follow up soon.</p>", autoScroll: true, entryPreview: true },
      },
    },
    {
      id: "form-speaker-interest",
      input: {
        name: "Speaker interest",
        slug: "speaker-interest",
        description: "A draft form for future speaker intake and review.",
        tags: ["speaker", "draft"],
        status: "draft",
        submitButtonText: "Save interest",
        submittingText: "Saving…",
        settings: { enableConditionalLogic: true, storeSpamEntries: true, minimumSubmitSeconds: 3, countryFilter: [], keywordFilter: [], captchaProvider: "none", aiEnabled: false },
        fields: [
          { fieldType: "name", fieldId: "name", label: "Name", isRequired: true },
          { fieldType: "email", fieldId: "email", label: "Email", isRequired: true },
          { fieldType: "radio", fieldId: "format", label: "Preferred format", options: [{ label: "Interview", value: "interview" }, { label: "Panel", value: "panel" }, { label: "Workshop", value: "workshop" }] },
          { fieldType: "textarea", fieldId: "topic", label: "Proposed topic", isRequired: true },
        ],
        notifications: [{ name: "Speaker review", enabled: false, recipientEmails: ["studio@webinar.local"], subject: "Speaker interest: {{name}}", messageHtml: "<p>A speaker interest form was submitted.</p>" }],
        confirmation: { confirmationType: "message", messageHtml: "<p>Thanks — we will review the idea.</p>", autoScroll: true, entryPreview: false },
      },
    },
  ];
  const normalizedForms = new Map<string, ReturnType<typeof normalizeFormInput>>();
  for (const definition of formInputs) {
    const form = normalizeFormInput(definition.input, definition.id);
    normalizedForms.set(definition.id, form);
    await client.query(`
      INSERT INTO form_definitions
        (id, name, slug, description, tags_json, status, submit_button_text, submitting_text, settings_json,
         created_by, updated_by, created_at, updated_at, published_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$10,$11)
    `, [form.formId, form.name, form.slug, form.description, JSON.stringify(form.tags), form.status,
      form.submitButtonText, form.submittingText, JSON.stringify(form.settings), now, form.status === "published" ? now : null]);
    await insertFormParts(client, form, now);
  }

  const media = [
    { id: "media-studio-mark", fileName: "studio-mark.svg", storageKey: "studio-mark.svg", url: "/media/studio-mark.svg", mimeType: "image/svg+xml", fileSize: 1_100, width: 800, height: 520, altText: "Abstract teal and coral webinar studio mark", caption: "A reusable studio cover graphic." },
    { id: "media-session-card", fileName: "session-card.svg", storageKey: "session-card.svg", url: "/media/session-card.svg", mimeType: "image/svg+xml", fileSize: 1_250, width: 1200, height: 760, altText: "Illustrated webinar session card", caption: "Sample card artwork for page-builder previews." },
  ];
  for (const asset of media) {
    await client.query(`
      INSERT INTO media_assets
        (id, file_name, storage_key, url, mime_type, file_size, width, height, alt_text, caption, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$11)
    `, [asset.id, asset.fileName, asset.storageKey, asset.url, asset.mimeType, asset.fileSize, asset.width, asset.height, asset.altText, asset.caption, now]);
  }

  const entries = [
    { id: "entry-demo-session-1", formId: "form-session-request", number: 1, values: { name: "Avery Jordan", email: "attendee@webinar.local", topic: "operations", message: "We would like a calm run-through of our next operating briefing.", consent: "on" }, isRead: false, isStarred: true, isSpam: false, paymentStatus: "none", hoursAgo: 2 },
    { id: "entry-demo-session-2", formId: "form-session-request", number: 2, values: { name: "Jordan Ellis", email: "jordan@webinar.local", topic: "leadership", message: "A short leadership lab would help our managers practice together.", consent: "on" }, isRead: true, isStarred: false, isSpam: false, paymentStatus: "paid", hoursAgo: 26 },
    { id: "entry-demo-session-3", formId: "form-session-request", number: 3, values: { name: "Synthetic Spam", email: "spam@webinar.local", topic: "custom", message: "This fixture is here to exercise the spam filter view.", consent: "on" }, isRead: false, isStarred: false, isSpam: true, paymentStatus: "none", hoursAgo: 49 },
  ] as const;
  const notificationId = normalizedForms.get("form-session-request")?.notifications[0]?.id ?? null;
  for (const entry of entries) {
    const createdAt = new Date(Date.parse(now) - entry.hoursAgo * 60 * 60 * 1000).toISOString();
    await client.query(`
      INSERT INTO form_entries
        (id, form_id, entry_number, values_json, is_read, is_starred, is_spam, payment_status, country, user_agent, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'US','Synthetic studio fixture',$9,$9)
    `, [entry.id, entry.formId, entry.number, JSON.stringify(entry.values), entry.isRead, entry.isStarred, entry.isSpam, entry.paymentStatus, createdAt]);
    await client.query(`
      INSERT INTO form_entry_audit (id, entry_id, action, metadata_json, created_at)
      VALUES ($1,$2,'public_submission',$3,$4)
    `, [randomUUID(), entry.id, JSON.stringify({ synthetic: true, source: "studio-fixture" }), createdAt]);
    if (!entry.isSpam && notificationId) {
      await client.query(`
        INSERT INTO form_entry_delivery (id, entry_id, notification_id, provider, recipient_email, status, created_at)
        VALUES ($1,$2,$3,'local','studio@webinar.local','queued',$4)
      `, [randomUUID(), entry.id, notificationId, createdAt]);
    }
  }

  await client.query(`
    INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
    VALUES ($1,NULL,'studio.samples.seeded','studio','forms-and-media',$2,$3)
  `, [randomUUID(), JSON.stringify({ seedVersion: STUDIO_SAMPLE_SEED_VERSION, synthetic: true }), now]);
  await client.query(`
    INSERT INTO system_metadata (key, value, updated_at) VALUES ('studio_seed_version', $1, $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `, [STUDIO_SAMPLE_SEED_VERSION, now]);

  return { forms: formInputs.length, media: media.length, entries: entries.length, alreadySeeded: false };
}

async function seedWithinTransaction(client: DatabaseClient): Promise<{ webinars: number; registrations: number; alreadySeeded: boolean }> {
  const metadata = await client.query<{ value: string }>("SELECT value FROM system_metadata WHERE key = 'seed_version'");
  if (metadata.rows[0]?.value === SAMPLE_SEED_VERSION) {
    const counts = await client.query<{ webinars: number; registrations: number }>(`
      SELECT (SELECT COUNT(*) FROM webinars)::int AS webinars,
        (SELECT COUNT(*) FROM registrations)::int AS registrations
    `);
    return { ...counts.rows[0], alreadySeeded: true };
  }

  const counts = await client.query<{ webinars: number; registrations: number; users: number }>(`
    SELECT (SELECT COUNT(*) FROM webinars)::int AS webinars,
      (SELECT COUNT(*) FROM registrations)::int AS registrations,
      (SELECT COUNT(*) FROM users)::int AS users
  `);
  if (Number(counts.rows[0].webinars) || Number(counts.rows[0].registrations) || Number(counts.rows[0].users)) {
    throw new Error("Refusing to seed samples into a database that already contains unmarked application records.");
  }

  const now = new Date().toISOString();
  const webinars = [
    {
      id: "webinar-operations-readiness",
      slug: "operations-readiness-briefing",
      title: "Operations Readiness Briefing",
      eyebrow: "Live briefing",
      description: "A focused working session for teams turning plans into calm, repeatable action.",
      longDescription: "Bring your current operating plan and leave with a sharper decision rhythm, a practical facilitation pattern, and a simple set of signals your team can use immediately.",
      startsAt: isoFromNow(4, 18),
      duration: 75,
      status: "published",
      hostName: "Maya Chen",
      hostBio: "Maya helps distributed teams translate complex operating goals into clear, human-scale habits.",
      replayLabel: "Replay available after the live session",
      replayUrl: "https://video.example.test/replays/operations-readiness",
      accent: "teal",
    },
    {
      id: "webinar-leadership-lab",
      slug: "lead-from-the-front-lab",
      title: "Lead from the Front: Practical Leadership Lab",
      eyebrow: "Interactive lab",
      description: "A small-group lab for leaders who want better conversations, decisions, and follow-through.",
      longDescription: "Use real scenarios, peer reflection, and a lightweight decision canvas to make leadership practice more observable and easier to repeat.",
      startsAt: isoFromNow(9, 12),
      duration: 90,
      status: "published",
      hostName: "Jules Okafor",
      hostBio: "Jules designs learning experiences that turn good intentions into useful team behaviors.",
      replayLabel: "Replay included with registration",
      replayUrl: "https://video.example.test/replays/leadership-lab",
      accent: "coral",
    },
    {
      id: "webinar-tabletop-workshop",
      slug: "incident-response-tabletop",
      title: "Incident Response Tabletop Workshop",
      eyebrow: "Coming soon",
      description: "A guided tabletop format for practicing response decisions before pressure makes them harder.",
      longDescription: "This sample draft gives administrators a place to prepare a future session, define tiers, and open registration when the run-of-show is ready.",
      startsAt: isoFromNow(17, 16),
      duration: 120,
      status: "draft",
      hostName: "Riley Santos",
      hostBio: "Riley facilitates practical exercises for teams navigating change, risk, and uncertainty.",
      replayLabel: "Replay planned",
      replayUrl: null,
      accent: "gold",
    },
  ] as const;

  for (const webinar of webinars) {
    await client.query(`
      INSERT INTO webinars
        (id, slug, title, eyebrow, description, long_description, starts_at, duration_minutes,
         timezone, status, provider, host_name, host_bio, replay_label, replay_url, accent, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'America/Chicago', $9, 'Live room', $10, $11, $12, $13, $14, $15, $15)
    `, [webinar.id, webinar.slug, webinar.title, webinar.eyebrow, webinar.description,
      webinar.longDescription, webinar.startsAt, webinar.duration, webinar.status, webinar.hostName,
      webinar.hostBio, webinar.replayLabel, webinar.replayUrl, webinar.accent, now]);
  }

  const tierDefinitions = [
    { webinarId: "webinar-operations-readiness", key: "standard", name: "Standard seat", price: 4900, capacity: 18, order: 0 },
    { webinarId: "webinar-operations-readiness", key: "studio", name: "Studio seat", price: 8900, capacity: 8, order: 1 },
    { webinarId: "webinar-leadership-lab", key: "lab", name: "Lab seat", price: 6500, capacity: 14, order: 0 },
    { webinarId: "webinar-leadership-lab", key: "coaching", name: "Coaching seat", price: 12900, capacity: 6, order: 1 },
    { webinarId: "webinar-tabletop-workshop", key: "workshop", name: "Workshop seat", price: 14900, capacity: 20, order: 0 },
  ];

  for (const tier of tierDefinitions) {
    const tierId = `${tier.webinarId}-tier-${tier.key}`;
    await client.query(
      "INSERT INTO tiers (id, webinar_id, name, price_cents, capacity, sort_order) VALUES ($1, $2, $3, $4, $5, $6)",
      [tierId, tier.webinarId, tier.name, tier.price, tier.capacity, tier.order]);
    await client.query(`
      INSERT INTO seats (id, tier_id, seat_number, status)
      SELECT $1 || '-seat-' || n::text, $1, n, 'available'
      FROM generate_series(1, $2::int) AS n
    `, [tierId, tier.capacity]);
  }

  const sampleRegistrations = [
    { webinarId: "webinar-operations-readiness", tierKey: "standard", seat: 2, name: "Avery Jordan", email: "attendee@demo.webinar.local", phone: "+1 555 010 1101", userId: null, consent: true },
    { webinarId: "webinar-operations-readiness", tierKey: "standard", seat: 5, name: "Jordan Ellis", email: "jordan.ellis@example.test", phone: "+1 555 010 1102", userId: null, consent: true },
    { webinarId: "webinar-operations-readiness", tierKey: "studio", seat: 1, name: "Casey Morgan", email: "casey.morgan@example.test", phone: "+1 555 010 1103", userId: null, consent: false },
    { webinarId: "webinar-leadership-lab", tierKey: "lab", seat: 3, name: "Sam Taylor", email: "sam.taylor@example.test", phone: "+1 555 010 1104", userId: null, consent: true },
    { webinarId: "webinar-leadership-lab", tierKey: "coaching", seat: 2, name: "Taylor Brooks", email: "taylor.brooks@example.test", phone: "+1 555 010 1105", userId: null, consent: true },
  ];

  const registrationIds: string[] = [];
  for (const [index, sample] of sampleRegistrations.entries()) {
    const tierId = `${sample.webinarId}-tier-${sample.tierKey}`;
    const registrationId = `registration-demo-${index + 1}`;
    const seatId = `${tierId}-seat-${sample.seat}`;
    const tier = tierDefinitions.find((item) => item.webinarId === sample.webinarId && item.key === sample.tierKey);
    if (!tier) throw new Error("A sample registration references an undefined ticket tier.");
    await client.query(`
      INSERT INTO registrations
        (id, registration_group_id, webinar_id, tier_id, seat_id, user_id,
         customer_name, customer_email, customer_phone, notification_consent,
         payment_status, access_status, is_winner, price_cents, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'paid', 'active', FALSE, $11, $12)
    `, [registrationId, `group-demo-${index + 1}`, sample.webinarId, tierId, seatId,
      sample.userId, sample.name, sample.email, sample.phone, sample.consent, tier.price, now]);
    await client.query("UPDATE seats SET status = 'sold', registration_id = $1 WHERE id = $2", [registrationId, seatId]);
    registrationIds.push(registrationId);
  }

  for (const registrationId of registrationIds.slice(0, 2)) {
    await client.query(`
      INSERT INTO deliveries (id, registration_id, channel, template_key, status, attempts, idempotency_key, created_at)
      VALUES ($1, $2, 'email', 'registration-confirmed', 'queued', 0, $3, $4)
    `, [randomUUID(), registrationId, `${registrationId}:registration-confirmed:email`, now]);
  }

  await client.query(`
    INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
    VALUES ($1, $2, 'samples.seeded', 'system', 'standalone-demo', $3, $4)
  `, [randomUUID(), null,
    JSON.stringify({ seedVersion: SAMPLE_SEED_VERSION, synthetic: true, originalDataImported: false }), now]);

  const metadataValues = [
    ["installation_id", randomUUID()],
    ["dataset_origin", "standalone"],
    ["schema_version", "1"],
    ["seed_version", SAMPLE_SEED_VERSION],
    ["original_data_imported", "false"],
  ];
  for (const [key, value] of metadataValues) {
    await client.query(`
      INSERT INTO system_metadata (key, value, updated_at) VALUES ($1, $2, $3)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `, [key, value, now]);
  }

  return { webinars: webinars.length, registrations: sampleRegistrations.length, alreadySeeded: false };
}
