import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { getDb, isDemoMode, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import type {
  CustomerReplayAccess,
  DashboardData,
  HoldResult,
  PublicWebinarDetails,
  PublicWebinarListItem,
  RegistrationView,
  SeatStatus,
  TierView,
  WebinarDetails,
  WebinarListItem,
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

type WebinarRow = DatabaseRow & {
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
  capacity: number | string;
  sold: number | string;
  held: number | string;
  available: number | string;
  revenue_cents: number | string;
};

type RegistrationRow = DatabaseRow & {
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
  is_winner: boolean | number;
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
    durationMinutes: Number(row.duration_minutes),
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
    seatNumber: Number(row.seat_number),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    paymentStatus: row.payment_status,
    accessStatus: row.access_status,
    isWinner: Boolean(row.is_winner),
    priceCents: Number(row.price_cents),
    createdAt: row.created_at,
  };
}

async function webinarSummaryRows(publicOnly = false): Promise<WebinarRow[]> {
  const where = publicOnly ? "WHERE w.status IN ('published', 'sold_out')" : "";
  const { rows } = await getDb().query<WebinarRow>(`
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
      COALESCE((SELECT SUM(tier_capacity.capacity) FROM tiers tier_capacity WHERE tier_capacity.webinar_id = w.id), 0)::int AS capacity,
      COUNT(*) FILTER (WHERE s.status = 'sold')::int AS sold,
      COUNT(*) FILTER (WHERE s.status = 'held' AND s.hold_expires_at > $1)::int AS held,
      COUNT(*) FILTER (WHERE s.status = 'available' OR (s.status = 'held' AND s.hold_expires_at <= $1))::int AS available,
      COALESCE(SUM(r.price_cents) FILTER (WHERE r.payment_status = 'paid'), 0)::int AS revenue_cents
    FROM webinars w
    LEFT JOIN tiers t ON t.webinar_id = w.id
    LEFT JOIN seats s ON s.tier_id = t.id
    LEFT JOIN registrations r ON r.seat_id = s.id
    ${where}
    GROUP BY w.id
    ORDER BY w.starts_at ASC
  `, [new Date().toISOString()]);
  return rows;
}

export async function getWebinars(publicOnly = false): Promise<WebinarListItem[]> {
  return (await webinarSummaryRows(publicOnly)).map(toWebinarListItem);
}

export async function getPublicWebinars(): Promise<PublicWebinarListItem[]> {
  return (await getWebinars(true)).map(({ revenueCents: _revenueCents, ...webinar }) => webinar);
}

async function registrationsForWebinar(webinarId: string, client?: DatabaseClient): Promise<RegistrationView[]> {
  const database = client ?? getDb();
  const { rows } = await database.query<RegistrationRow>(`
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
    WHERE r.webinar_id = $1
    ORDER BY r.created_at DESC
  `, [webinarId]);
  return rows.map(toRegistration);
}

async function webinarDetailsById(id: string, includeRegistrations: true): Promise<WebinarDetails | null>;
async function webinarDetailsById(id: string, includeRegistrations: false): Promise<PublicWebinarDetails | null>;
async function webinarDetailsById(id: string, includeRegistrations: boolean): Promise<WebinarDetails | PublicWebinarDetails | null>;
async function webinarDetailsById(id: string, includeRegistrations: boolean): Promise<WebinarDetails | PublicWebinarDetails | null> {
  const summary = (await webinarSummaryRows(false)).find((item) => item.id === id);
  if (!summary) return null;

  const database = getDb();
  const [detailsResult, tiersResult, seatsResult] = await Promise.all([
    database.query<Pick<WebinarRow, "host_bio" | "long_description" | "replay_label" | "replay_url">>(
      "SELECT host_bio, long_description, replay_label, replay_url FROM webinars WHERE id = $1", [id]),
    database.query<{ id: string; name: string; price_cents: number; capacity: number }>(
      "SELECT id, name, price_cents, capacity FROM tiers WHERE webinar_id = $1 ORDER BY sort_order ASC", [id]),
    database.query<{ id: string; tier_id: string; seat_number: number; status: SeatStatus; hold_expires_at: string | null }>(`
      SELECT s.id, s.tier_id, s.seat_number, s.status, s.hold_expires_at
      FROM seats s JOIN tiers t ON t.id = s.tier_id
      WHERE t.webinar_id = $1
      ORDER BY s.tier_id, s.seat_number
    `, [id]),
  ]);
  const details = detailsResult.rows[0];
  if (!details) return null;
  const now = Date.now();
  const tiers: TierView[] = tiersResult.rows.map((tier) => ({
    id: tier.id,
    name: tier.name,
    priceCents: Number(tier.price_cents),
    capacity: Number(tier.capacity),
    seats: seatsResult.rows
      .filter((seat) => seat.tier_id === tier.id)
      .map((seat) => ({
        id: seat.id,
        number: Number(seat.seat_number),
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

  const registrations = await registrationsForWebinar(id);
  return { ...base, registrations, latestWinner: registrations.find((registration) => registration.isWinner) ?? null };
}

export async function getWebinarById(id: string): Promise<WebinarDetails | null> {
  return webinarDetailsById(id, true);
}

export async function getPublicWebinarBySlug(slug: string): Promise<PublicWebinarDetails | null> {
  const { rows } = await getDb().query<{ id: string }>(
    "SELECT id FROM webinars WHERE slug = $1 AND status IN ('published', 'sold_out')", [slug]);
  return rows[0] ? webinarDetailsById(rows[0].id, false) : null;
}

export async function getWebinarBySlug(slug: string): Promise<WebinarDetails | null> {
  const { rows } = await getDb().query<{ id: string }>("SELECT id FROM webinars WHERE slug = $1", [slug]);
  return rows[0] ? getWebinarById(rows[0].id) : null;
}

async function registrationRows(sql: string, values: unknown[] = []): Promise<RegistrationView[]> {
  const { rows } = await getDb().query<RegistrationRow>(sql, values);
  return rows.map(toRegistration);
}

const registrationSelect = `
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
`;

export function getRecentRegistrations(limit = 8): Promise<RegistrationView[]> {
  return registrationRows(`${registrationSelect} ORDER BY r.created_at DESC LIMIT $1`, [limit]);
}

export function getCustomerRegistrations(userId: string): Promise<RegistrationView[]> {
  return registrationRows(`${registrationSelect} WHERE r.user_id = $1 ORDER BY w.starts_at ASC, r.created_at DESC`, [userId]);
}

export async function getCustomerReplayAccess(userId: string, registrationId: string): Promise<CustomerReplayAccess | null> {
  const { rows } = await getDb().query<{
    registration_id: string;
    payment_status: "paid" | "pending" | "refunded";
    access_status: "active" | "removed";
    webinar_title: string;
    replay_label: string;
    replay_url: string | null;
    starts_at: string;
    timezone: string;
  }>(`
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
    WHERE r.id = $1 AND r.user_id = $2
  `, [registrationId, userId]);
  const row = rows[0];
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

export async function getDashboardData(): Promise<DashboardData> {
  const { rows } = await getDb().query<{
    upcoming: number;
    registrations: number;
    revenue_cents: number;
    available_seats: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM webinars WHERE status IN ('published', 'sold_out'))::int AS upcoming,
      (SELECT COUNT(*) FROM registrations WHERE payment_status = 'paid')::int AS registrations,
      (SELECT COALESCE(SUM(price_cents), 0) FROM registrations WHERE payment_status = 'paid')::int AS revenue_cents,
      (SELECT COUNT(*) FROM seats WHERE status = 'available' OR (status = 'held' AND hold_expires_at <= $1))::int AS available_seats
  `, [new Date().toISOString()]);
  const row = rows[0];
  const [webinars, recentRegistrations] = await Promise.all([getWebinars(false), getRecentRegistrations()]);
  return {
    stats: {
      upcoming: Number(row.upcoming),
      registrations: Number(row.registrations),
      revenueCents: Number(row.revenue_cents),
      availableSeats: Number(row.available_seats),
    },
    webinars,
    recentRegistrations,
  };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function withTransaction<T>(work: (client: DatabaseClient) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function createSeatHold(webinarId: string, seatIds: string[]): Promise<HoldResult> {
  const uniqueSeatIds = [...new Set(seatIds.filter((seatId) => typeof seatId === "string" && seatId.length > 0))].sort();
  if (uniqueSeatIds.length === 0 || uniqueSeatIds.length > 6) {
    throw new DomainError("Choose between one and six seats.");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);
  const holdToken = randomBytes(24).toString("base64url");
  const holdHash = tokenHash(holdToken);

  const seats = await withTransaction(async (client) => {
    await client.query(`
      UPDATE seats
      SET status = 'available', hold_token_hash = NULL, hold_expires_at = NULL
      WHERE status = 'held' AND hold_expires_at <= $1
    `, [nowIso]);

    const selected: Array<{ id: string; number: number; tierName: string }> = [];
    for (const seatId of uniqueSeatIds) {
      const { rows } = await client.query<{
        id: string;
        seat_number: number;
        status: SeatStatus;
        hold_expires_at: string | null;
        tier_name: string;
        webinar_id: string;
        webinar_status: WebinarStatus;
      }>(`
        SELECT s.id, s.seat_number, s.status, s.hold_expires_at,
          t.name AS tier_name, t.webinar_id, w.status AS webinar_status
        FROM seats s
        JOIN tiers t ON t.id = s.tier_id
        JOIN webinars w ON w.id = t.webinar_id
        WHERE s.id = $1
        FOR UPDATE OF s
      `, [seatId]);
      const seat = rows[0];
      if (!seat || seat.webinar_id !== webinarId) throw new DomainError("That seat is not part of this webinar.");
      if (seat.webinar_status !== "published") throw new DomainError("This webinar is not open for registration.", 409);
      if (seat.status === "sold") throw new DomainError(`Seat ${seat.seat_number} is already sold.`);
      if (seat.status === "held" && seat.hold_expires_at && new Date(seat.hold_expires_at).getTime() > now.getTime()) {
        throw new DomainError(`Seat ${seat.seat_number} is being held by another attendee.`);
      }
      const update = await client.query(`
        UPDATE seats
        SET status = 'held', hold_token_hash = $1, hold_expires_at = $2, registration_id = NULL
        WHERE id = $3 AND tier_id IN (SELECT id FROM tiers WHERE webinar_id = $4)
          AND (status = 'available' OR (status = 'held' AND hold_expires_at <= $5))
        RETURNING id
      `, [holdHash, expiresAt.toISOString(), seatId, webinarId, nowIso]);
      if (update.rowCount !== 1) throw new DomainError(`Seat ${seat.seat_number} became unavailable. Please try again.`);
      selected.push({ id: seat.id, number: Number(seat.seat_number), tierName: seat.tier_name });
    }
    return selected;
  });

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

export async function completeRegistration(input: RegistrationInput): Promise<{
  groupId: string;
  webinarId: string;
  webinarTitle: string;
  registrationIds: string[];
}> {
  if (!input.holdToken) throw new DomainError("Your seat hold has expired. Please choose your seats again.");
  if (!isDemoMode()) throw new DomainError("Payment processing is not configured for this release.", 503);

  const hash = tokenHash(input.holdToken);
  const now = new Date().toISOString();
  return withTransaction(async (client) => {
    const { rows: heldSeats } = await client.query<{
      id: string;
      seat_number: number;
      tier_id: string;
      tier_name: string;
      price_cents: number;
      webinar_id: string;
      webinar_title: string;
    }>(`
      SELECT s.id, s.seat_number, s.tier_id, t.name AS tier_name, t.price_cents,
        t.webinar_id, w.title AS webinar_title
      FROM seats s
      JOIN tiers t ON t.id = s.tier_id
      JOIN webinars w ON w.id = t.webinar_id
      WHERE s.hold_token_hash = $1 AND s.status = 'held' AND s.hold_expires_at > $2
        AND w.id = $3 AND w.status = 'published'
      ORDER BY s.tier_id, s.seat_number
      FOR UPDATE OF s
    `, [hash, now, input.webinarId]);
    if (heldSeats.length === 0) throw new DomainError("Your seat hold has expired. Please choose your seats again.", 409);

    const groupId = randomUUID();
    const registrationIds: string[] = [];
    for (const seat of heldSeats) {
      const registrationId = randomUUID();
      await client.query(`
        INSERT INTO registrations
          (id, registration_group_id, webinar_id, tier_id, seat_id, user_id,
           customer_name, customer_email, customer_phone, notification_consent,
           payment_status, access_status, price_cents, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'paid', 'active', $11, $12)
      `, [registrationId, groupId, seat.webinar_id, seat.tier_id, seat.id,
        input.userId ?? null, input.name, input.email, input.phone, input.consent,
        seat.price_cents, now]);
      const sold = await client.query(`
        UPDATE seats
        SET status = 'sold', hold_token_hash = NULL, hold_expires_at = NULL, registration_id = $1
        WHERE id = $2 AND status = 'held' AND hold_token_hash = $3
        RETURNING id
      `, [registrationId, seat.id, hash]);
      if (sold.rowCount !== 1) throw new DomainError("The seat could not be finalized. Please try again.", 409);

      await client.query(`
        INSERT INTO deliveries (id, registration_id, channel, template_key, status, attempts, idempotency_key, created_at)
        VALUES ($1, $2, 'email', 'registration-confirmed', 'queued', 0, $3, $4)
      `, [randomUUID(), registrationId, `${registrationId}:registration-confirmed:email`, now]);
      if (input.consent) {
        await client.query(`
          INSERT INTO deliveries (id, registration_id, channel, template_key, status, attempts, idempotency_key, created_at)
          VALUES ($1, $2, 'sms', 'registration-confirmed', 'queued', 0, $3, $4)
        `, [randomUUID(), registrationId, `${registrationId}:registration-confirmed:sms`, now]);
      }
      registrationIds.push(registrationId);
    }

    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'registration.created', 'registration_group', $3, $4, $5)
    `, [randomUUID(), input.userId ?? null, groupId, JSON.stringify({ source: "demo-checkout", seats: heldSeats.length }), now]);

    return {
      groupId,
      webinarId: heldSeats[0].webinar_id,
      webinarTitle: heldSeats[0].webinar_title,
      registrationIds,
    };
  });
}

export async function drawWinner(webinarId: string, drawnBy: string): Promise<RegistrationView> {
  return withTransaction(async (client) => {
    const webinar = await client.query("SELECT id FROM webinars WHERE id = $1 FOR UPDATE", [webinarId]);
    if (!webinar.rows[0]) throw new DomainError("The webinar could not be found.", 404);

    const existing = await client.query<{ registration_id: string }>(
      "SELECT registration_id FROM winner_draws WHERE webinar_id = $1", [webinarId]);
    if (existing.rows[0]) {
      const winner = (await registrationsForWebinar(webinarId, client)).find((registration) => registration.id === existing.rows[0].registration_id);
      if (winner) return winner;
      throw new DomainError("This webinar already has a winner draw.", 409);
    }

    const { rows: candidates } = await client.query<{ id: string }>(
      "SELECT id FROM registrations WHERE webinar_id = $1 AND payment_status = 'paid' AND access_status = 'active' ORDER BY id FOR UPDATE", [webinarId]);
    if (candidates.length === 0) throw new DomainError("There are no eligible paid registrations for this draw.");

    const selected = candidates[randomInt(candidates.length)].id;
    const now = new Date().toISOString();
    await client.query(`
      INSERT INTO winner_draws (id, webinar_id, registration_id, candidate_count, selection_method, drawn_by, created_at)
      VALUES ($1, $2, $3, $4, 'server-crypto-random-int', $5, $6)
    `, [randomUUID(), webinarId, selected, candidates.length, drawnBy, now]);
    await client.query("UPDATE registrations SET is_winner = (id = $1) WHERE webinar_id = $2", [selected, webinarId]);
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'winner.drawn', 'webinar', $3, $4, $5)
    `, [randomUUID(), drawnBy, webinarId, JSON.stringify({ candidateCount: candidates.length, selectionMethod: "server-crypto-random-int" }), now]);

    const winner = (await registrationsForWebinar(webinarId, client)).find((registration) => registration.id === selected);
    if (!winner) throw new DomainError("The winner was recorded but could not be loaded.", 500);
    return winner;
  });
}

export interface CreateWebinarInput {
  title: string;
  eyebrow: string;
  description: string;
  startsAt: string;
  timezone: string;
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

export async function createWebinar(input: CreateWebinarInput, actorId: string): Promise<WebinarDetails> {
  const webinarId = `webinar-${randomUUID()}`;
  const tierId = `${webinarId}-tier-primary`;
  const now = new Date().toISOString();
  const webinar = await withTransaction(async (client) => {
    let slug = slugify(input.title);
    const existing = await client.query("SELECT id FROM webinars WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) slug = `${slug}-${randomUUID().slice(0, 6)}`;

    await client.query(`
      INSERT INTO webinars
        (id, slug, title, eyebrow, description, long_description, starts_at,
         duration_minutes, timezone, status, provider, host_name, host_bio,
         replay_label, replay_url, accent, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9,
        'Manual meeting', $10, $11, 'Replay planned', NULL, 'teal', $12, $12)
    `, [webinarId, slug, input.title, input.eyebrow, input.description,
      new Date(input.startsAt).toISOString(), input.durationMinutes, input.timezone, input.status,
      input.hostName, "A new host profile is ready to be filled in from the admin console.", now]);
    await client.query(
      "INSERT INTO tiers (id, webinar_id, name, price_cents, capacity, sort_order) VALUES ($1, $2, $3, $4, $5, 0)",
      [tierId, webinarId, input.tierName, input.priceCents, input.capacity]);
    await client.query(`
      INSERT INTO seats (id, tier_id, seat_number, status)
      SELECT $1 || '-seat-' || n::text, $1, n, 'available'
      FROM generate_series(1, $2::int) AS n
    `, [tierId, input.capacity]);
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'webinar.created', 'webinar', $3, $4, $5)
    `, [randomUUID(), actorId, webinarId, JSON.stringify({ synthetic: true }), now]);
    return webinarId;
  });

  const result = await getWebinarById(webinar);
  if (!result) throw new DomainError("The webinar was created but could not be loaded.", 500);
  return result;
}

export async function cleanupExpiredHolds(): Promise<number> {
  const { rowCount } = await getDb().query(`
    UPDATE seats
    SET status = 'available', hold_token_hash = NULL, hold_expires_at = NULL
    WHERE status = 'held' AND hold_expires_at <= $1
  `, [new Date().toISOString()]);
  return rowCount ?? 0;
}
