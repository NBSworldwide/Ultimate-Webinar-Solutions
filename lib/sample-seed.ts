import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { DatabaseClient } from "@/lib/db";

const SAMPLE_SEED_VERSION = "synthetic-v1";

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
