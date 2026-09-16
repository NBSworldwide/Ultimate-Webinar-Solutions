import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/password";

const globalForWebinar = globalThis as unknown as {
  webinarDatabase?: Database.Database;
};

export function isDemoMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_MODE !== "false";
}

export function isDemoSeedAllowed(): boolean {
  return isDemoMode() && process.env.ALLOW_DEMO_SEED !== "false";
}

function assertRuntimeMode(): void {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED === "true") {
    throw new Error("ALLOW_DEMO_SEED=true is not permitted in production.");
  }
}

function databasePath(): string {
  const configured = process.env.DATABASE_PATH;
  return configured
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configured)
    : path.join(process.cwd(), ".data", "webinar.sqlite");
}

function createDatabase(): Database.Database {
  assertRuntimeMode();
  const filePath = databasePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const database = new Database(filePath);

  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'attendee')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webinars (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      eyebrow TEXT NOT NULL,
      description TEXT NOT NULL,
      long_description TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      timezone TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'sold_out', 'completed')),
      provider TEXT NOT NULL,
      host_name TEXT NOT NULL,
      host_bio TEXT NOT NULL,
      replay_label TEXT NOT NULL,
      replay_url TEXT,
      accent TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tiers (
      id TEXT PRIMARY KEY,
      webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
      seat_number INTEGER NOT NULL CHECK (seat_number > 0),
      status TEXT NOT NULL CHECK (status IN ('available', 'held', 'sold')),
      hold_token_hash TEXT,
      hold_expires_at TEXT,
      registration_id TEXT,
      UNIQUE (tier_id, seat_number)
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      registration_group_id TEXT NOT NULL,
      webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE RESTRICT,
      tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE RESTRICT,
      seat_id TEXT NOT NULL UNIQUE REFERENCES seats(id) ON DELETE RESTRICT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      notification_consent INTEGER NOT NULL DEFAULT 0 CHECK (notification_consent IN (0, 1)),
      payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending', 'refunded')),
      access_status TEXT NOT NULL CHECK (access_status IN ('active', 'removed')),
      is_winner INTEGER NOT NULL DEFAULT 0,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      registration_id TEXT REFERENCES registrations(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
      template_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT NOT NULL UNIQUE,
      last_error TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS winner_draws (
      id TEXT PRIMARY KEY,
      webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
      registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
      candidate_count INTEGER NOT NULL,
      selection_method TEXT NOT NULL,
      drawn_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL,
      UNIQUE (webinar_id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_webinars_status_start ON webinars(status, starts_at);
    CREATE INDEX IF NOT EXISTS idx_seats_status_expiry ON seats(status, hold_expires_at);
    CREATE INDEX IF NOT EXISTS idx_registrations_webinar ON registrations(webinar_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status, created_at);
  `);

  seedIfEmpty(database);
  ensureSystemMetadata(database);
  return database;
}

function isoFromNow(days: number, hour: number): string {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}

function seedIfEmpty(database: Database.Database): void {
  const existing = database.prepare("SELECT COUNT(*) AS count FROM webinars").get() as { count: number };
  if (existing.count > 0 || !isDemoSeedAllowed()) return;

  const now = new Date().toISOString();
  const adminId = "user_demo_admin";
  const attendeeId = "user_demo_attendee";

  const seed = database.transaction(() => {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(adminId, "admin@demo.webinar.local", "Morgan Lee", "admin", hashPassword("demo-admin"), now);
    insertUser.run(attendeeId, "attendee@demo.webinar.local", "Avery Jordan", "attendee", hashPassword("demo-attendee"), now);

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
        timezone: "America/Chicago",
        status: "published",
        provider: "Live room",
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
        timezone: "America/Chicago",
        status: "published",
        provider: "Live room",
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
        timezone: "America/Chicago",
        status: "draft",
        provider: "Manual meeting",
        hostName: "Riley Santos",
        hostBio: "Riley facilitates practical exercises for teams navigating change, risk, and uncertainty.",
        replayLabel: "Replay planned",
        replayUrl: null,
        accent: "gold",
      },
    ];

    const insertWebinar = database.prepare(`
      INSERT INTO webinars
        (id, slug, title, eyebrow, description, long_description, starts_at, duration_minutes, timezone, status, provider, host_name, host_bio, replay_label, replay_url, accent, created_at, updated_at)
      VALUES (@id, @slug, @title, @eyebrow, @description, @longDescription, @startsAt, @duration, @timezone, @status, @provider, @hostName, @hostBio, @replayLabel, @replayUrl, @accent, @now, @now)
    `);
    const insertTier = database.prepare(`
      INSERT INTO tiers (id, webinar_id, name, price_cents, capacity, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertSeat = database.prepare(`
      INSERT INTO seats (id, tier_id, seat_number, status)
      VALUES (?, ?, ?, 'available')
    `);

    const tierDefinitions: Record<string, Array<{ key: string; name: string; price: number; capacity: number }>> = {
      "webinar-operations-readiness": [
        { key: "standard", name: "Standard seat", price: 4900, capacity: 18 },
        { key: "studio", name: "Studio seat", price: 8900, capacity: 8 },
      ],
      "webinar-leadership-lab": [
        { key: "lab", name: "Lab seat", price: 6500, capacity: 14 },
        { key: "coaching", name: "Coaching seat", price: 12900, capacity: 6 },
      ],
      "webinar-tabletop-workshop": [
        { key: "workshop", name: "Workshop seat", price: 14900, capacity: 20 },
      ],
    };

    for (const webinar of webinars) {
      insertWebinar.run({ ...webinar, longDescription: webinar.longDescription, now });
      for (const [index, tier] of tierDefinitions[webinar.id].entries()) {
        const tierId = `${webinar.id}-tier-${tier.key}`;
        insertTier.run(tierId, webinar.id, tier.name, tier.price, tier.capacity, index);
        for (let seat = 1; seat <= tier.capacity; seat += 1) {
          insertSeat.run(`${tierId}-seat-${seat}`, tierId, seat);
        }
      }
    }

    const sampleRegistrations = [
      { webinarId: "webinar-operations-readiness", tierKey: "standard", seat: 2, name: "Avery Jordan", email: "attendee@demo.webinar.local", phone: "+1 555 010 1101", userId: attendeeId, consent: 1 },
      { webinarId: "webinar-operations-readiness", tierKey: "standard", seat: 5, name: "Jordan Ellis", email: "jordan.ellis@example.test", phone: "+1 555 010 1102", userId: null, consent: 1 },
      { webinarId: "webinar-operations-readiness", tierKey: "studio", seat: 1, name: "Casey Morgan", email: "casey.morgan@example.test", phone: "+1 555 010 1103", userId: null, consent: 0 },
      { webinarId: "webinar-leadership-lab", tierKey: "lab", seat: 3, name: "Sam Taylor", email: "sam.taylor@example.test", phone: "+1 555 010 1104", userId: null, consent: 1 },
      { webinarId: "webinar-leadership-lab", tierKey: "coaching", seat: 2, name: "Taylor Brooks", email: "taylor.brooks@example.test", phone: "+1 555 010 1105", userId: null, consent: 1 },
    ];
    const insertRegistration = database.prepare(`
      INSERT INTO registrations
        (id, registration_group_id, webinar_id, tier_id, seat_id, user_id, customer_name, customer_email, customer_phone, notification_consent, payment_status, access_status, is_winner, price_cents, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'active', 0, ?, ?)
    `);
    const markSold = database.prepare(`UPDATE seats SET status = 'sold', registration_id = ? WHERE id = ?`);

    sampleRegistrations.forEach((sample, index) => {
      const tier = database.prepare("SELECT id, price_cents FROM tiers WHERE webinar_id = ? AND id LIKE ?").get(sample.webinarId, `%${sample.tierKey}`) as { id: string; price_cents: number };
      const seat = database.prepare("SELECT id FROM seats WHERE tier_id = ? AND seat_number = ?").get(tier.id, sample.seat) as { id: string };
      const registrationId = `registration-demo-${index + 1}`;
      insertRegistration.run(registrationId, `group-demo-${index + 1}`, sample.webinarId, tier.id, seat.id, sample.userId, sample.name, sample.email, sample.phone, sample.consent, tier.price_cents, now);
      markSold.run(registrationId, seat.id);
    });

    const insertDelivery = database.prepare(`
      INSERT INTO deliveries (id, registration_id, channel, template_key, status, attempts, idempotency_key, created_at, sent_at)
      VALUES (?, ?, ?, ?, 'sent', 1, ?, ?, ?)
    `);
    insertDelivery.run("delivery-demo-1", "registration-demo-1", "email", "registration-confirmed", "registration-demo-1:registration-confirmed:email", now, now);
    insertDelivery.run("delivery-demo-2", "registration-demo-1", "sms", "registration-confirmed", "registration-demo-1:registration-confirmed:sms", now, now);

    database.prepare(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), adminId, "demo.seeded", "system", "demo", JSON.stringify({ source: "synthetic-seed", originalDataImported: false }), now);
  });

  seed();
}

function ensureSystemMetadata(database: Database.Database): void {
  const existing = database.prepare("SELECT value FROM system_metadata WHERE key = 'dataset_origin'").get() as { value: string } | undefined;
  if (existing) {
    if (existing.value === "synthetic-demo" && process.env.NODE_ENV === "production") {
      throw new Error("The production process cannot open a synthetic demo database.");
    }
    if (!["empty", "synthetic-demo", "production"].includes(existing.value)) {
      throw new Error("The database has an unrecognized dataset origin.");
    }
    return;
  }

  const hasData = (database.prepare("SELECT COUNT(*) AS count FROM webinars").get() as { count: number }).count > 0;
  if (hasData && process.env.NODE_ENV === "production") {
    throw new Error("The database has data but no recognized standalone origin marker.");
  }

  const now = new Date().toISOString();
  const origin = hasData ? "synthetic-demo" : "empty";
  const metadata = database.prepare("INSERT INTO system_metadata (key, value, updated_at) VALUES (?, ?, ?)");
  metadata.run("installation_id", randomUUID(), now);
  metadata.run("dataset_origin", origin, now);
  metadata.run("schema_version", "1", now);
  metadata.run("seed_version", hasData ? "synthetic-v1" : "none", now);
}

export function getSystemMetadata(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM system_metadata").all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function getDb(): Database.Database {
  if (!globalForWebinar.webinarDatabase) {
    globalForWebinar.webinarDatabase = createDatabase();
  }
  return globalForWebinar.webinarDatabase;
}
