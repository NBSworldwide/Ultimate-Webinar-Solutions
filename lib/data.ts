import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { getDb, isDemoMode } from "@/lib/db";
import type {
  CustomerReplayAccess,
  DashboardData,
  HoldResult,
  RegistrationView,
  SeatStatus,
  TierView,
  User,
  WebinarDetails,
  WebinarListItem,
  PublicWebinarDetails,
  PublicWebinarListItem,
  WebinarStatus,
} from "@/lib/types";

export const HOLD_MINUTES = 10;

export class DomainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
  }
}

type WebinarRow = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  long_description: string;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
  status: WebinarStatus;
  provider: string;
  host_name: string;
  host_bio: string;
  replay_label: string;
  replay_url: string | null;
  accent: string;
  capacity: number;
  sold: number;
  held: number;
  available: number;
  revenue_cents: number;
};

type RegistrationRow = {
  id: string;
  registration_group_id: string;
  webinar_id: string;
  webinar_title: string;
  tier_name: string;
  seat_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_status: "paid" | "pending" | "refunded";
  access_status: "active" | "removed";
  is_winner: number;
  price_cents: number;
  created_at: string;
};

function toWebinarListItem(row: WebinarRow): WebinarListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eyebrow: row.eyebrow,
    description: row.description,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    timezone: row.timezone,
    status: row.status,
    provider: row.provider,
    hostName: row.host_name,
    accent: row.accent,
    capacity: Number(row.capacity ?? 0),
    sold: Number(row.sold ?? 0),
    held: Number(row.held ?? 0),
    available: Number(row.available ?? 0),
    revenueCents: Number(row.revenue_cents ?? 0),
  };
}

function toRegistration(row: RegistrationRow): RegistrationView {
  return {
    id: row.id,
    registrationGroupId: row.registration_group_id,
    webinarId: row.webinar_id,
    webinarTitle: row.webinar_title,
    tierName: row.tier_name,
    seatNumber: row.seat_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    paymentStatus: row.payment_status,
    accessStatus: row.access_status,
    isWinner: row.is_winner === 1,
    priceCents: row.price_cents,
    createdAt: row.created_at,
  };
}

function webinarSummaryRows(publicOnly = false): WebinarRow[] {
  const database = getDb();
  const now = new Date().toISOString();
  const where = publicOnly ? "WHERE w.status IN ('published', 'sold_out')" : "";
  return database
    .prepare(`
      SELECT
        w.id,
        w.slug,
        w.title,
        w.eyebrow,
        w.description,
        w.long_description,
        w.starts_at,
        w.duration_minutes,
        w.timezone,
        w.status,
        w.provider,
        w.host_name,
        w.host_bio,
        w.replay_label,
        w.replay_url,
        w.accent,
        COALESCE((SELECT SUM(tier_capacity.capacity) FROM tiers tier_capacity WHERE tier_capacity.webinar_id = w.id), 0) AS capacity,
        COALESCE(SUM(CASE WHEN s.status = 'sold' THEN 1 ELSE 0 END), 0) AS sold,
        COALESCE(SUM(CASE WHEN s.status = 'held' AND s.hold_expires_at > @now THEN 1 ELSE 0 END), 0) AS held,
        COALESCE(SUM(CASE WHEN s.status = 'available' OR (s.status = 'held' AND s.hold_expires_at <= @now) THEN 1 ELSE 0 END), 0) AS available,
        COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.price_cents ELSE 0 END), 0) AS revenue_cents
      FROM webinars w
      LEFT JOIN tiers t ON t.webinar_id = w.id
      LEFT JOIN seats s ON s.tier_id = t.id
      LEFT JOIN registrations r ON r.seat_id = s.id
      ${where}
      GROUP BY w.id
      ORDER BY w.starts_at ASC
    `)
    .all({ now }) as WebinarRow[];
}

export function getWebinars(publicOnly = false): WebinarListItem[] {
  return webinarSummaryRows(publicOnly).map(toWebinarListItem);
}

export function getPublicWebinars(): PublicWebinarListItem[] {
  return getWebinars(true).map(({ revenueCents: _revenueCents, ...webinar }) => webinar);
}

function registrationsForWebinar(webinarId: string): RegistrationView[] {
  const database = getDb();
  const rows = database
    .prepare(`
      SELECT
        r.id,
        r.registration_group_id,
        r.webinar_id,
        w.title AS webinar_title,
        t.name AS tier_name,
        s.seat_number,
        r.customer_name,
        r.customer_email,
        r.customer_phone,
        r.payment_status,
        r.access_status,
        r.is_winner,
        r.price_cents,
        r.created_at
      FROM registrations r
      JOIN webinars w ON w.id = r.webinar_id
      JOIN tiers t ON t.id = r.tier_id
      JOIN seats s ON s.id = r.seat_id
      WHERE r.webinar_id = ?
      ORDER BY r.created_at DESC
    `)
    .all(webinarId) as RegistrationRow[];
  return rows.map(toRegistration);
}

export function getWebinarById(id: string): WebinarDetails | null {
  return getWebinarDetailsById(id, true);
}

function getWebinarDetailsById(id: string, includeRegistrations: true): WebinarDetails | null;
function getWebinarDetailsById(id: string, includeRegistrations: false): PublicWebinarDetails | null;
function getWebinarDetailsById(id: string, includeRegistrations: boolean): WebinarDetails | PublicWebinarDetails | null {
  const summary = webinarSummaryRows(false).find((item) => item.id === id);
  if (!summary) return null;

  const database = getDb();
  const details = database.prepare("SELECT host_bio, long_description, replay_label, replay_url FROM webinars WHERE id = ?").get(id) as Pick<WebinarRow, "host_bio" | "long_description" | "replay_label" | "replay_url">;
  const tierRows = database
    .prepare("SELECT id, name, price_cents, capacity FROM tiers WHERE webinar_id = ? ORDER BY sort_order ASC")
    .all(id) as Array<{ id: string; name: string; price_cents: number; capacity: number }>;
  const seatRows = database
    .prepare("SELECT id, tier_id, seat_number, status, hold_expires_at FROM seats WHERE tier_id IN (SELECT id FROM tiers WHERE webinar_id = ?) ORDER BY tier_id, seat_number")
    .all(id) as Array<{ id: string; tier_id: string; seat_number: number; status: SeatStatus; hold_expires_at: string | null }>;
  const now = Date.now();
  const tiers: TierView[] = tierRows.map((tier) => ({
    id: tier.id,
    name: tier.name,
    priceCents: tier.price_cents,
    capacity: tier.capacity,
    seats: seatRows
      .filter((seat) => seat.tier_id === tier.id)
      .map((seat) => ({
        id: seat.id,
        number: seat.seat_number,
        status: seat.status === "held" && (!seat.hold_expires_at || new Date(seat.hold_expires_at).getTime() <= now) ? "available" : seat.status,
      })),
  }));
  const base = {
    ...toWebinarListItem(summary),
    hostBio: details.host_bio,
    longDescription: details.long_description,
    replayLabel: details.replay_label,
    replayUrl: details.replay_url,
    tiers,
  };
  if (!includeRegistrations) {
    const { revenueCents: _revenueCents, ...publicDetails } = base;
    return publicDetails;
  }

  const registrations = registrationsForWebinar(id);
  return { ...base, registrations, latestWinner: registrations.find((registration) => registration.isWinner) ?? null };
}

export function getWebinarBySlug(slug: string): WebinarDetails | null {
  const row = getDb().prepare("SELECT id FROM webinars WHERE slug = ?").get(slug) as { id: string } | undefined;
  return row ? getWebinarById(row.id) : null;
}

export function getPublicWebinarBySlug(slug: string): PublicWebinarDetails | null {
  const row = getDb().prepare("SELECT id FROM webinars WHERE slug = ? AND status IN ('published', 'sold_out')").get(slug) as { id: string } | undefined;
  return row ? getWebinarDetailsById(row.id, false) : null;
}

export function getRecentRegistrations(limit = 8): RegistrationView[] {
  const database = getDb();
  const rows = database
    .prepare(`
      SELECT
        r.id,
        r.registration_group_id,
        r.webinar_id,
        w.title AS webinar_title,
        t.name AS tier_name,
        s.seat_number,
        r.customer_name,
        r.customer_email,
        r.customer_phone,
        r.payment_status,
        r.access_status,
        r.is_winner,
        r.price_cents,
        r.created_at
      FROM registrations r
      JOIN webinars w ON w.id = r.webinar_id
      JOIN tiers t ON t.id = r.tier_id
      JOIN seats s ON s.id = r.seat_id
      ORDER BY r.created_at DESC
      LIMIT ?
    `)
    .all(limit) as RegistrationRow[];
  return rows.map(toRegistration);
}

export function getCustomerRegistrations(userId: string): RegistrationView[] {
  const database = getDb();
  const rows = database
    .prepare(`
      SELECT
        r.id,
        r.registration_group_id,
        r.webinar_id,
        w.title AS webinar_title,
        t.name AS tier_name,
        s.seat_number,
        r.customer_name,
        r.customer_email,
        r.customer_phone,
        r.payment_status,
        r.access_status,
        r.is_winner,
        r.price_cents,
        r.created_at
      FROM registrations r
      JOIN webinars w ON w.id = r.webinar_id
      JOIN tiers t ON t.id = r.tier_id
      JOIN seats s ON s.id = r.seat_id
      WHERE r.user_id = ?
      ORDER BY w.starts_at ASC, r.created_at DESC
    `)
    .all(userId) as RegistrationRow[];
  return rows.map(toRegistration);
}

export function getCustomerReplayAccess(userId: string, registrationId: string): CustomerReplayAccess | null {
  const row = getDb().prepare(`
    SELECT
      r.id AS registration_id,
      r.payment_status,
      r.access_status,
      w.title AS webinar_title,
      w.replay_label,
      w.replay_url,
      w.starts_at,
      w.timezone
    FROM registrations r
    JOIN webinars w ON w.id = r.webinar_id
    WHERE r.id = ? AND r.user_id = ?
  `).get(registrationId, userId) as {
    registration_id: string;
    payment_status: "paid" | "pending" | "refunded";
    access_status: "active" | "removed";
    webinar_title: string;
    replay_label: string;
    replay_url: string | null;
    starts_at: string;
    timezone: string;
  } | undefined;

  if (!row) return null;
  return {
    registrationId: row.registration_id,
    webinarTitle: row.webinar_title,
    replayLabel: row.replay_label,
    replayUrl: row.replay_url,
    startsAt: row.starts_at,
    timezone: row.timezone,
    accessStatus: row.access_status,
    paymentStatus: row.payment_status,
  };
}

export function getDashboardData(): DashboardData {
  const database = getDb();
  const row = database
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM webinars WHERE status IN ('published', 'sold_out')) AS upcoming,
        (SELECT COUNT(*) FROM registrations WHERE payment_status = 'paid') AS registrations,
        (SELECT COALESCE(SUM(price_cents), 0) FROM registrations WHERE payment_status = 'paid') AS revenue_cents,
        (SELECT COUNT(*) FROM seats WHERE status = 'available' OR (status = 'held' AND hold_expires_at <= @now)) AS available_seats
    `)
    .get({ now: new Date().toISOString() }) as { upcoming: number; registrations: number; revenue_cents: number; available_seats: number };

  return {
    stats: {
      upcoming: Number(row.upcoming),
      registrations: Number(row.registrations),
      revenueCents: Number(row.revenue_cents),
      availableSeats: Number(row.available_seats),
    },
    webinars: getWebinars(false),
    recentRegistrations: getRecentRegistrations(),
  };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSeatHold(webinarId: string, seatIds: string[]): HoldResult {
  const uniqueSeatIds = [...new Set(seatIds.filter((seatId) => typeof seatId === "string" && seatId.length > 0))];
  if (uniqueSeatIds.length === 0 || uniqueSeatIds.length > 6) {
    throw new DomainError("Choose between one and six seats.");
  }

  const database = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);
  const holdToken = randomBytes(24).toString("base64url");
  const holdHash = tokenHash(holdToken);

  const seats = database.transaction(() => {
    database.prepare(`
      UPDATE seats
      SET status = 'available', hold_token_hash = NULL, hold_expires_at = NULL
      WHERE status = 'held' AND hold_expires_at <= ?
    `).run(nowIso);

    const selected: Array<{ id: string; number: number; tierName: string }> = [];
    const getSeat = database.prepare(`
      SELECT s.id, s.seat_number, s.status, s.hold_expires_at, t.name AS tier_name, t.webinar_id, w.status AS webinar_status
      FROM seats s JOIN tiers t ON t.id = s.tier_id JOIN webinars w ON w.id = t.webinar_id WHERE s.id = ?
    `);
    const updateSeat = database.prepare(`
      UPDATE seats
      SET status = 'held', hold_token_hash = ?, hold_expires_at = ?, registration_id = NULL
      WHERE id = ? AND tier_id IN (SELECT id FROM tiers WHERE webinar_id = ?) AND (status = 'available' OR (status = 'held' AND hold_expires_at <= ?))
    `);

    for (const seatId of uniqueSeatIds) {
      const seat = getSeat.get(seatId) as { id: string; seat_number: number; status: SeatStatus; hold_expires_at: string | null; tier_name: string; webinar_id: string; webinar_status: WebinarStatus } | undefined;
      if (!seat || seat.webinar_id !== webinarId) throw new DomainError("That seat is not part of this webinar.");
      if (seat.webinar_status !== "published") throw new DomainError("This webinar is not open for registration.", 409);
      if (seat.status === "sold") throw new DomainError(`Seat ${seat.seat_number} is already sold.`);
      if (seat.status === "held" && seat.hold_expires_at && new Date(seat.hold_expires_at).getTime() > now.getTime()) {
        throw new DomainError(`Seat ${seat.seat_number} is being held by another attendee.`);
      }
      const result = updateSeat.run(holdHash, expiresAt.toISOString(), seatId, webinarId, nowIso);
      if (result.changes !== 1) throw new DomainError(`Seat ${seat.seat_number} became unavailable. Please try again.`);
      selected.push({ id: seat.id, number: seat.seat_number, tierName: seat.tier_name });
    }
    return selected;
  })();

  return { holdToken, expiresAt: expiresAt.toISOString(), seats };
}

export interface RegistrationInput {
  webinarId: string;
  holdToken: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
  userId?: string | null;
}

export function completeRegistration(input: RegistrationInput): { groupId: string; webinarId: string; webinarTitle: string; registrationIds: string[] } {
  if (!input.holdToken) throw new DomainError("Your seat hold has expired. Please choose your seats again.");
  if (!isDemoMode()) {
    throw new DomainError("Payment processing is not configured for this release.", 503);
  }
  const database = getDb();
  const hash = tokenHash(input.holdToken);
  const now = new Date().toISOString();

  return database.transaction(() => {
    const heldSeats = database
      .prepare(`
        SELECT s.id, s.seat_number, s.tier_id, t.name AS tier_name, t.price_cents, t.webinar_id, w.title AS webinar_title
        FROM seats s
        JOIN tiers t ON t.id = s.tier_id
        JOIN webinars w ON w.id = t.webinar_id
        WHERE s.hold_token_hash = ? AND s.status = 'held' AND s.hold_expires_at > ? AND w.id = ? AND w.status = 'published'
        ORDER BY s.tier_id, s.seat_number
      `)
      .all(hash, now, input.webinarId) as Array<{ id: string; seat_number: number; tier_id: string; tier_name: string; price_cents: number; webinar_id: string; webinar_title: string }>;
    if (heldSeats.length === 0) throw new DomainError("Your seat hold has expired. Please choose your seats again.", 409);

    const groupId = randomUUID();
    const registrationIds: string[] = [];
    const insertRegistration = database.prepare(`
      INSERT INTO registrations
        (id, registration_group_id, webinar_id, tier_id, seat_id, user_id, customer_name, customer_email, customer_phone, notification_consent, payment_status, access_status, price_cents, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'active', ?, ?)
    `);
    const sellSeat = database.prepare(`
      UPDATE seats
      SET status = 'sold', hold_token_hash = NULL, hold_expires_at = NULL, registration_id = ?
      WHERE id = ? AND status = 'held' AND hold_token_hash = ?
    `);
    const queueDelivery = database.prepare(`
      INSERT INTO deliveries (id, registration_id, channel, template_key, status, attempts, idempotency_key, created_at)
      VALUES (?, ?, ?, ?, 'queued', 0, ?, ?)
    `);

    for (const seat of heldSeats) {
      const registrationId = randomUUID();
      insertRegistration.run(registrationId, groupId, seat.webinar_id, seat.tier_id, seat.id, input.userId ?? null, input.name, input.email, input.phone, input.consent ? 1 : 0, seat.price_cents, now);
      const result = sellSeat.run(registrationId, seat.id, hash);
      if (result.changes !== 1) throw new DomainError("The seat could not be finalized. Please try again.", 409);
      queueDelivery.run(randomUUID(), registrationId, "email", "registration-confirmed", `${registrationId}:registration-confirmed:email`, now);
      if (input.consent) queueDelivery.run(randomUUID(), registrationId, "sms", "registration-confirmed", `${registrationId}:registration-confirmed:sms`, now);
      registrationIds.push(registrationId);
    }

    database.prepare(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, 'registration.created', 'registration_group', ?, ?, ?)
    `).run(randomUUID(), input.userId ?? null, groupId, JSON.stringify({ source: "demo-checkout", seats: heldSeats.length }), now);

    return { groupId, webinarId: heldSeats[0].webinar_id, webinarTitle: heldSeats[0].webinar_title, registrationIds };
  })();
}

export function drawWinner(webinarId: string, drawnBy: string): RegistrationView {
  const database = getDb();
  return database.transaction(() => {
    const existing = database.prepare("SELECT registration_id FROM winner_draws WHERE webinar_id = ? ORDER BY created_at DESC LIMIT 1").get(webinarId) as { registration_id: string } | undefined;
    if (existing) {
      const winner = registrationsForWebinar(webinarId).find((registration) => registration.id === existing.registration_id);
      if (winner) return winner;
      throw new DomainError("This webinar already has a winner draw.", 409);
    }

    const candidates = database
      .prepare("SELECT id FROM registrations WHERE webinar_id = ? AND payment_status = 'paid' AND access_status = 'active'")
      .all(webinarId) as Array<{ id: string }>;
    if (candidates.length === 0) throw new DomainError("There are no eligible paid registrations for this draw.");

    const selected = candidates[randomInt(candidates.length)].id;
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO winner_draws (id, webinar_id, registration_id, candidate_count, selection_method, drawn_by, created_at)
      VALUES (?, ?, ?, ?, 'server-crypto-random-int', ?, ?)
    `).run(randomUUID(), webinarId, selected, candidates.length, drawnBy, now);
    database.prepare("UPDATE registrations SET is_winner = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE webinar_id = ?").run(selected, webinarId);
    database.prepare(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, 'winner.drawn', 'webinar', ?, ?, ?)
    `).run(randomUUID(), drawnBy, webinarId, JSON.stringify({ candidateCount: candidates.length, selectionMethod: "server-crypto-random-int" }), now);

    const winner = registrationsForWebinar(webinarId).find((registration) => registration.id === selected);
    if (!winner) throw new DomainError("The winner was recorded but could not be loaded.", 500);
    return winner;
  })();
}

export interface CreateWebinarInput {
  title: string;
  eyebrow: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  hostName: string;
  tierName: string;
  priceCents: number;
  capacity: number;
  status: "draft" | "published";
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || `webinar-${Date.now()}`;
}

export function createWebinar(input: CreateWebinarInput, actorId: string): WebinarDetails {
  const database = getDb();
  const webinarId = `webinar-${randomUUID()}`;
  const tierId = `${webinarId}-tier-primary`;
  const now = new Date().toISOString();
  let slug = slugify(input.title);
  if (database.prepare("SELECT id FROM webinars WHERE slug = ?").get(slug)) slug = `${slug}-${randomUUID().slice(0, 6)}`;

  database.transaction(() => {
    database.prepare(`
      INSERT INTO webinars
        (id, slug, title, eyebrow, description, long_description, starts_at, duration_minutes, timezone, status, provider, host_name, host_bio, replay_label, replay_url, accent, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'America/Chicago', ?, 'Manual meeting', ?, ?, 'Replay planned', NULL, 'teal', ?, ?)
    `).run(webinarId, slug, input.title, input.eyebrow, input.description, input.description, new Date(input.startsAt).toISOString(), input.durationMinutes, input.status, input.hostName, "A new host profile is ready to be filled in from the admin console.", now, now);
    database.prepare("INSERT INTO tiers (id, webinar_id, name, price_cents, capacity, sort_order) VALUES (?, ?, ?, ?, ?, 0)").run(tierId, webinarId, input.tierName, input.priceCents, input.capacity);
    const insertSeat = database.prepare("INSERT INTO seats (id, tier_id, seat_number, status) VALUES (?, ?, ?, 'available')");
    for (let seat = 1; seat <= input.capacity; seat += 1) insertSeat.run(`${tierId}-seat-${seat}`, tierId, seat);
    database.prepare(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, 'webinar.created', 'webinar', ?, ?, ?)
    `).run(randomUUID(), actorId, webinarId, JSON.stringify({ synthetic: true }), now);
  })();

  const webinar = getWebinarById(webinarId);
  if (!webinar) throw new DomainError("The webinar was created but could not be loaded.", 500);
  return webinar;
}

export function cleanupExpiredHolds(): number {
  const now = new Date().toISOString();
  return getDb().prepare(`
    UPDATE seats SET status = 'available', hold_token_hash = NULL, hold_expires_at = NULL
    WHERE status = 'held' AND hold_expires_at <= ?
  `).run(now).changes;
}
