import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, isDemoMode, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { upsertCrmContact } from "@/lib/crm";
import { queueCorrespondence, scheduleCorrespondenceSequence } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { queueSms } from "@/lib/sms";
import { generateInviteCode, hashInviteCode, hashPrivateAccessToken, normalizeInviteEmail } from "@/lib/private-access-core";
import type {
  CustomerReplayAccess,
  DashboardData,
  HoldResult,
  PricingModel,
  PricingRounding,
  PublicWebinarDetails,
  PublicWebinarListItem,
  RegistrationView,
  SeatStatus,
  TierView,
  WebinarDetails,
  WebinarInviteView,
  WebinarListItem,
  WebinarStatus,
  WebinarVisibility,
  PaymentStatus,
  GiveawayOutcome,
} from "@/lib/types";

export const HOLD_MINUTES = 5;

export { DomainError } from "@/lib/errors";

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
  visibility: WebinarVisibility;
  provider: string;
  host_name: string;
  host_bio: string;
  replay_label: string;
  replay_url: string | null;
  accent: string;
  price_cents: number | string;
  giveaway_enabled: boolean | number;
  prize_product_id: string | null;
  prize_product_name: string | null;
  prize_product_sku: string | null;
  prize_product_price_cents: number | string | null;
  claim_deadline: string | null;
  fulfillment_notes: string;
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
  payment_status: "free" | "paid" | "pending" | "refunded";
  access_status: "active" | "removed";
  is_winner: boolean | number;
  giveaway_outcome: GiveawayOutcome | null;
  giveaway_result_at: string | null;
  giveaway_prize_name: string | null;
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
    visibility: row.visibility,
    provider: row.provider,
    hostName: row.host_name,
    accent: row.accent,
    replayUrl: row.replay_url,
    priceCents: Number(row.price_cents ?? 0),
    capacity: Number(row.capacity ?? 0),
    sold: Number(row.sold ?? 0),
    held: Number(row.held ?? 0),
    available: Number(row.available ?? 0),
    revenueCents: Number(row.revenue_cents ?? 0),
    giveawayEnabled: Boolean(row.giveaway_enabled),
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
    giveawayOutcome: row.giveaway_outcome,
    giveawayResultAt: row.giveaway_result_at,
    giveawayPrizeName: row.giveaway_prize_name,
    priceCents: Number(row.price_cents),
    createdAt: row.created_at,
  };
}

async function webinarSummaryRows(publicOnly = false, filters?: { query?: string; status?: WebinarStatus | "all"; visibility?: WebinarVisibility | "all"; publicTab?: "available" | "ended"; category?: string }): Promise<WebinarRow[]> {
  await assertStandaloneDataset();
  const values: unknown[] = [new Date().toISOString()];
  const publicTab = filters?.publicTab ?? "available";
  const conditions = publicOnly ? ["w.visibility = 'public'", publicTab === "ended" ? "w.status = 'completed'" : "w.status IN ('published', 'sold_out')"] : [];
  const query = filters?.query?.trim();
  if (query) {
    values.push(`%${query}%`);
    conditions.push(`(w.title ILIKE $${values.length} OR w.host_name ILIKE $${values.length} OR w.description ILIKE $${values.length})`);
  }
  if (!publicOnly && filters?.status && filters.status !== "all") {
    values.push(filters.status);
    conditions.push(`w.status = $${values.length}`);
  }
  if (!publicOnly && filters?.visibility && filters.visibility !== "all") {
    values.push(filters.visibility);
    conditions.push(`w.visibility = $${values.length}`);
  }
  if (publicOnly && filters?.category) {
    values.push(filters.category);
    conditions.push(`w.eyebrow = $${values.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = publicOnly && publicTab === "ended" ? "DESC" : "ASC";
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
      w.visibility,
      w.provider,
      w.host_name,
      w.host_bio,
      w.replay_label,
      w.replay_url,
      w.accent,
      COALESCE((SELECT MIN(tier_price.price_cents) FROM tiers tier_price WHERE tier_price.webinar_id = w.id), 0)::int AS price_cents,
      w.giveaway_enabled,
      w.prize_product_id,
      w.prize_product_name,
      w.prize_product_sku,
      w.prize_product_price_cents,
      w.claim_deadline,
      w.fulfillment_notes,
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
    ORDER BY w.starts_at ${order}
  `, values);
  return rows;
}

export async function getWebinars(publicOnly = false, filters?: { query?: string; status?: WebinarStatus | "all"; visibility?: WebinarVisibility | "all" }): Promise<WebinarListItem[]> {
  return (await webinarSummaryRows(publicOnly, filters)).map(toWebinarListItem);
}

export async function getPublicWebinars(options?: { tab?: "available" | "ended"; category?: string }): Promise<PublicWebinarListItem[]> {
  return (await webinarSummaryRows(true, { publicTab: options?.tab ?? "available", category: options?.category })).map((row) => {
    const { revenueCents: _revenueCents, visibility: _visibility, ...webinar } = toWebinarListItem(row);
    return webinar;
  });
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
      r.giveaway_outcome,
      r.giveaway_result_at,
      r.giveaway_prize_name,
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
    database.query<{ id: string; name: string; price_cents: number; capacity: number; pricing_model: PricingModel; reference_value_cents: number | null; rounding_mode: PricingRounding }>(
      "SELECT id, name, price_cents, capacity, pricing_model, reference_value_cents, rounding_mode FROM tiers WHERE webinar_id = $1 ORDER BY sort_order ASC", [id]),
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
    pricingModel: tier.pricing_model,
    referenceValueCents: tier.reference_value_cents === null ? null : Number(tier.reference_value_cents),
    roundingMode: tier.rounding_mode,
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
    const { revenueCents: _revenueCents, visibility: _visibility, giveawayEnabled: _giveawayEnabled, ...publicDetails } = base;
    return publicDetails;
  }

  const registrations = await registrationsForWebinar(id);
  return {
    ...base,
    prizeProductId: summary.prize_product_id,
    prizeProductName: summary.prize_product_name,
    prizeProductSku: summary.prize_product_sku,
    prizeProductPriceCents: summary.prize_product_price_cents === null ? null : Number(summary.prize_product_price_cents),
    claimDeadline: summary.claim_deadline,
    fulfillmentNotes: summary.fulfillment_notes,
    registrations,
    latestWinner: registrations.find((registration) => registration.isWinner) ?? null,
  };
}

export async function getWebinarById(id: string): Promise<WebinarDetails | null> {
  return webinarDetailsById(id, true);
}

export async function getPublicWebinarBySlug(slug: string): Promise<PublicWebinarDetails | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<{ id: string }>(
    "SELECT id FROM webinars WHERE slug = $1 AND visibility = 'public' AND status IN ('published', 'sold_out', 'completed')", [slug]);
  return rows[0] ? webinarDetailsById(rows[0].id, false) : null;
}

export interface SeatAvailability {
  status: WebinarStatus;
  tiers: Array<{
    id: string;
    seats: Array<{ id: string; number: number; status: SeatStatus }>;
  }>;
}

export async function getSeatAvailability(webinarId: string, privateAccessToken?: string | null): Promise<SeatAvailability | null> {
  return withTransaction(async (client) => {
    await assertWebinarAccess(client, webinarId, privateAccessToken);
    const webinarResult = await client.query<{ status: WebinarStatus }>(
      "SELECT status FROM webinars WHERE id = $1 AND status IN ('published', 'sold_out')",
      [webinarId],
    );
    const webinar = webinarResult.rows[0];
    if (!webinar) return null;

    const now = new Date().toISOString();
    await client.query(`
      UPDATE seats
      SET status = 'available', hold_token_hash = NULL, hold_expires_at = NULL
      WHERE status = 'held' AND hold_expires_at <= $1
    `, [now]);
    const [tiersResult, seatsResult] = await Promise.all([
      client.query<{ id: string }>("SELECT id FROM tiers WHERE webinar_id = $1 ORDER BY sort_order ASC", [webinarId]),
      client.query<{ id: string; tier_id: string; seat_number: number; status: SeatStatus }>(`
        SELECT s.id, s.tier_id, s.seat_number, s.status
        FROM seats s JOIN tiers t ON t.id = s.tier_id
        WHERE t.webinar_id = $1
        ORDER BY s.tier_id, s.seat_number
      `, [webinarId]),
    ]);
    const seatsByTier = new Map<string, Array<{ id: string; number: number; status: SeatStatus }>>();
    for (const seat of seatsResult.rows) {
      const seats = seatsByTier.get(seat.tier_id) ?? [];
      seats.push({ id: seat.id, number: Number(seat.seat_number), status: seat.status });
      seatsByTier.set(seat.tier_id, seats);
    }
    return {
      status: webinar.status,
      tiers: tiersResult.rows.map((tier) => ({ id: tier.id, seats: seatsByTier.get(tier.id) ?? [] })),
    };
  });
}

export async function getWebinarBySlug(slug: string): Promise<WebinarDetails | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<{ id: string }>("SELECT id FROM webinars WHERE slug = $1", [slug]);
  return rows[0] ? getWebinarById(rows[0].id) : null;
}

type WebinarAccess = {
  visibility: WebinarVisibility;
  inviteId: string | null;
  inviteEmail: string | null;
};

async function assertWebinarAccess(
  client: DatabaseClient,
  webinarId: string,
  privateAccessToken?: string | null,
  email?: string,
): Promise<WebinarAccess> {
  const now = new Date().toISOString();
  const tokenHash = privateAccessToken ? hashPrivateAccessToken(privateAccessToken) : null;
  const { rows } = await client.query<{
    visibility: WebinarVisibility;
    invite_id: string | null;
    invite_email: string | null;
  }>(`
    SELECT w.visibility, pws.invite_id, wi.email AS invite_email
    FROM webinars w
    LEFT JOIN private_webinar_sessions pws
      ON pws.webinar_id = w.id
      AND pws.token_hash = $2
      AND pws.expires_at > $3
    LEFT JOIN webinar_invites wi
      ON wi.id = pws.invite_id
      AND wi.revoked_at IS NULL
      AND wi.expires_at > $3
    WHERE w.id = $1
  `, [webinarId, tokenHash, now]);
  const access = rows[0];
  if (!access) throw new DomainError("The webinar could not be found.", 404);
  if (access.visibility === "private" && (!access.invite_id || !access.invite_email)) {
    throw new DomainError("A valid invitation is required for this private webinar.", 403);
  }
  if (email && access.invite_email && normalizeInviteEmail(email) !== normalizeInviteEmail(access.invite_email)) {
    throw new DomainError("Use the email address that received the invitation.", 403);
  }
  return { visibility: access.visibility, inviteId: access.invite_id, inviteEmail: access.invite_email };
}

async function privateSessionForSlug(slug: string, privateAccessToken: string | null): Promise<{
  webinarId: string;
  inviteId: string;
  email: string;
  expiresAt: string;
} | null> {
  if (!privateAccessToken) return null;
  await assertStandaloneDataset();
  const now = new Date().toISOString();
  const { rows } = await getDb().query<{
    webinar_id: string;
    invite_id: string;
    email: string;
    expires_at: string;
  }>(`
    SELECT w.id AS webinar_id, wi.id AS invite_id, wi.email, pws.expires_at
    FROM private_webinar_sessions pws
    JOIN webinars w ON w.id = pws.webinar_id
    JOIN webinar_invites wi ON wi.id = pws.invite_id
    WHERE w.slug = $1
      AND w.visibility = 'private'
      AND w.status IN ('published', 'sold_out')
      AND pws.token_hash = $2
      AND pws.expires_at > $3
      AND wi.revoked_at IS NULL
      AND wi.expires_at > $3
  `, [slug, hashPrivateAccessToken(privateAccessToken), now]);
  const session = rows[0];
  return session ? { webinarId: session.webinar_id, inviteId: session.invite_id, email: session.email, expiresAt: session.expires_at } : null;
}

export async function getPrivateWebinarBySlug(slug: string, privateAccessToken: string | null): Promise<PublicWebinarDetails | null> {
  const session = await privateSessionForSlug(slug, privateAccessToken);
  return session ? webinarDetailsById(session.webinarId, false) : null;
}

export async function getPrivateWebinarRoomBySlug(slug: string, privateAccessToken: string | null): Promise<{
  webinar: PublicWebinarDetails;
  registered: boolean;
} | null> {
  const session = await privateSessionForSlug(slug, privateAccessToken);
  if (!session) return null;
  const webinar = await webinarDetailsById(session.webinarId, false);
  if (!webinar) return null;
  const { rows } = await getDb().query<{ registered: boolean | number }>(`
    SELECT EXISTS(
      SELECT 1 FROM registrations
      WHERE webinar_id = $1
        AND lower(customer_email) = lower($2)
        AND payment_status IN ('free', 'paid')
        AND access_status = 'active'
    ) AS registered
  `, [session.webinarId, session.email]);
  return { webinar, registered: Boolean(rows[0]?.registered) };
}

export async function getPrivateWebinarInvites(webinarId: string): Promise<WebinarInviteView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<{
    id: string;
    email: string;
    expires_at: string;
    revoked_at: string | null;
    last_verified_at: string | null;
    redeemed_at: string | null;
    created_at: string;
  }>(`
    SELECT id, email, expires_at, revoked_at, last_verified_at, redeemed_at, created_at
    FROM webinar_invites
    WHERE webinar_id = $1
    ORDER BY created_at DESC, email ASC
  `, [webinarId]);
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastVerifiedAt: row.last_verified_at,
    redeemedAt: row.redeemed_at,
    createdAt: row.created_at,
  }));
}

export async function createWebinarInvites(webinarId: string, emails: string[], actorId: string, expiresAt?: string): Promise<Array<{
  email: string;
  code: string;
  expiresAt: string;
  webinarSlug: string;
}>> {
  const normalizedEmails = [...new Set(emails.map(normalizeInviteEmail).filter(Boolean))];
  if (normalizedEmails.length === 0 || normalizedEmails.length > 500) {
    throw new DomainError("Provide between one and five hundred email addresses.");
  }
  if (normalizedEmails.some((email) => email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new DomainError("Every invitation must contain a valid email address.");
  }

  const requestedExpiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 86_400_000);
  if (Number.isNaN(requestedExpiry.getTime()) || requestedExpiry.getTime() <= Date.now()) {
    throw new DomainError("Invitation expiry must be a future date.");
  }
  const expiry = requestedExpiry.toISOString();
  const now = new Date().toISOString();
  return withTransaction(async (client) => {
    const webinarResult = await client.query<{ slug: string; visibility: WebinarVisibility }>(
      "SELECT slug, visibility FROM webinars WHERE id = $1 FOR UPDATE", [webinarId]);
    const webinar = webinarResult.rows[0];
    if (!webinar) throw new DomainError("The webinar could not be found.", 404);
    if (webinar.visibility !== "private") throw new DomainError("Invitations can only be created for private webinars.");

    const generated: Array<{ email: string; code: string; expiresAt: string; webinarSlug: string }> = [];
    for (const email of normalizedEmails) {
      const code = generateInviteCode();
      await client.query(`
        INSERT INTO webinar_invites (id, webinar_id, email, code_hash, expires_at, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (webinar_id, email) DO UPDATE SET
          code_hash = EXCLUDED.code_hash,
          expires_at = EXCLUDED.expires_at,
          revoked_at = NULL,
          last_verified_at = NULL,
          redeemed_at = NULL,
          created_by = EXCLUDED.created_by,
          created_at = EXCLUDED.created_at
      `, [randomUUID(), webinarId, email, hashInviteCode(code), expiry, actorId, now]);
      generated.push({ email, code, expiresAt: expiry, webinarSlug: webinar.slug });
    }
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'webinar.invites_generated', 'webinar', $3, $4, $5)
    `, [randomUUID(), actorId, webinarId, JSON.stringify({ emailCount: generated.length, synthetic: true }), now]);
    return generated;
  });
}

export async function revokeWebinarInvite(inviteId: string, actorId: string): Promise<void> {
  const now = new Date().toISOString();
  await withTransaction(async (client) => {
    const result = await client.query<{ webinar_id: string }>(
      "UPDATE webinar_invites SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL RETURNING webinar_id", [now, inviteId]);
    if (!result.rows[0]) throw new DomainError("The invitation could not be found or is already revoked.", 404);
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'webinar.invite_revoked', 'invite', $3, $4, $5)
    `, [randomUUID(), actorId, inviteId, JSON.stringify({ webinarId: result.rows[0].webinar_id, synthetic: true }), now]);
  });
}

async function registrationRows(sql: string, values: unknown[] = []): Promise<RegistrationView[]> {
  await assertStandaloneDataset();
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
    r.giveaway_outcome,
    r.giveaway_result_at,
    r.giveaway_prize_name,
    r.price_cents,
    r.created_at
  FROM registrations r
  JOIN webinars w ON w.id = r.webinar_id
  JOIN tiers t ON t.id = r.tier_id
  JOIN seats s ON s.id = r.seat_id
`;

export function getRecentRegistrations(limit = 8, filters?: { query?: string; paymentStatus?: PaymentStatus | "all"; accessStatus?: "active" | "removed" | "all" }, offset = 0): Promise<RegistrationView[]> {
  const values: unknown[] = [];
  const conditions: string[] = [];
  const query = filters?.query?.trim();
  if (query) {
    values.push(`%${query}%`);
    conditions.push(`(r.customer_name ILIKE $${values.length} OR r.customer_email ILIKE $${values.length} OR w.title ILIKE $${values.length})`);
  }
  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    values.push(filters.paymentStatus);
    conditions.push(`r.payment_status = $${values.length}`);
  }
  if (filters?.accessStatus && filters.accessStatus !== "all") {
    values.push(filters.accessStatus);
    conditions.push(`r.access_status = $${values.length}`);
  }
  values.push(limit);
  const limitParameter = values.length;
  values.push(offset);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return registrationRows(`${registrationSelect}${where} ORDER BY r.created_at DESC LIMIT $${limitParameter} OFFSET $${values.length}`, values);
}

export function getCustomerRegistrations(userId: string): Promise<RegistrationView[]> {
  return registrationRows(`${registrationSelect} WHERE r.user_id = $1 ORDER BY w.starts_at ASC, r.created_at DESC`, [userId]);
}

export async function getCustomerReplayAccess(userId: string, registrationId: string): Promise<CustomerReplayAccess | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<{
    registration_id: string;
    payment_status: "free" | "paid" | "pending" | "refunded";
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
      (SELECT COUNT(*) FROM registrations WHERE payment_status IN ('free', 'paid'))::int AS registrations,
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
  await assertStandaloneDataset();
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

export async function createSeatHold(webinarId: string, seatIds: string[], privateAccessToken?: string | null): Promise<HoldResult> {
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
    await assertWebinarAccess(client, webinarId, privateAccessToken);
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
  smsConsent?: boolean;
  userId?: string | null;
  privateAccessToken?: string | null;
}

export async function completeRegistration(input: RegistrationInput): Promise<{
  groupId: string;
  webinarId: string;
  webinarTitle: string;
  registrationIds: string[];
}> {
  if (!input.userId) throw new DomainError("Create or sign in to a customer account before completing registration.", 401);
  if (!input.holdToken) throw new DomainError("Your seat hold has expired. Please choose your seats again.");

  const hash = tokenHash(input.holdToken);
  const now = new Date().toISOString();
  return withTransaction(async (client) => {
    const access = await assertWebinarAccess(client, input.webinarId, input.privateAccessToken, input.email);
    const { rows: heldSeats } = await client.query<{
      id: string;
      seat_number: number;
      tier_id: string;
      tier_name: string;
      price_cents: number;
      webinar_id: string;
      webinar_slug: string;
      webinar_title: string;
      webinar_starts_at: string;
      webinar_timezone: string;
    }>(`
      SELECT s.id, s.seat_number, s.tier_id, t.name AS tier_name, t.price_cents,
        t.webinar_id, w.slug AS webinar_slug, w.title AS webinar_title,
        w.starts_at AS webinar_starts_at, w.timezone AS webinar_timezone
      FROM seats s
      JOIN tiers t ON t.id = s.tier_id
      JOIN webinars w ON w.id = t.webinar_id
      WHERE s.hold_token_hash = $1 AND s.status = 'held' AND s.hold_expires_at > $2
        AND w.id = $3 AND w.status = 'published'
      ORDER BY s.tier_id, s.seat_number
      FOR UPDATE OF s
    `, [hash, now, input.webinarId]);
    if (heldSeats.length === 0) throw new DomainError("Your seat hold has expired. Please choose your seats again.", 409);
    const isFree = heldSeats.every((seat) => Number(seat.price_cents) === 0);
    if (!isFree && !isDemoMode()) throw new DomainError("Payment processing is not configured for this release.", 503);
    const paymentStatus = isFree ? "free" : "paid";
    const smsConsent = input.smsConsent ?? false;

    const groupId = randomUUID();
    const registrationIds: string[] = [];
    for (const seat of heldSeats) {
      const registrationId = randomUUID();
      await client.query(`
        INSERT INTO registrations
          (id, registration_group_id, webinar_id, tier_id, seat_id, user_id,
           customer_name, customer_email, customer_phone, notification_consent,
           sms_consent, sms_consent_at, sms_consent_source, payment_status,
           access_status, price_cents, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15, $16)
      `, [registrationId, groupId, seat.webinar_id, seat.tier_id, seat.id,
        input.userId ?? null, input.name, input.email, input.phone, input.consent || smsConsent,
        smsConsent, smsConsent ? now : null, smsConsent ? "registration-form" : null,
        paymentStatus, seat.price_cents, now]);
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
      registrationIds.push(registrationId);
    }

    const firstSeat = heldSeats[0];
    const contactId = await upsertCrmContact({ email: input.email, name: input.name, phone: input.phone, source: "registration", lifecycleStage: "attendee", marketingConsent: input.consent, smsConsent }, input.userId ?? null, client);
    await client.query("INSERT INTO crm_activities (id, contact_id, activity_type, subject, body, entity_type, entity_id, occurred_at, created_by) VALUES ($1, $2, 'registration', $3, $4, 'registration_group', $5, $6, $7)", [randomUUID(), contactId, `Registered for ${firstSeat.webinar_title}`, `Seats: ${heldSeats.length}`, groupId, now, input.userId ?? null]);
    await scheduleCorrespondenceSequence({
      client,
      triggerKey: "registration.created",
      recipientEmail: input.email,
      recipientName: input.name,
      entityType: "registration_group",
      entityId: groupId,
      payload: {
        customer_name: input.name,
        session_title: firstSeat.webinar_title,
        session_start_time: "See your session details",
        session_access_link: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/${access.visibility === "private" ? "private-webinars" : "webinars"}/${firstSeat.webinar_slug}`,
      },
    });
    if (smsConsent) {
      const sessionAccessLink = `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/${access.visibility === "private" ? "private-webinars" : "webinars"}/${firstSeat.webinar_slug}`;
      const smsPayload = {
        customer_name: input.name,
        session_title: firstSeat.webinar_title,
        session_start_time: formatDateTime(firstSeat.webinar_starts_at, firstSeat.webinar_timezone),
        session_access_link: sessionAccessLink,
      };
      await queueSms({ client, templateSlug: "registration-confirmed", triggerKey: "registration.created", recipientPhone: input.phone, recipientName: input.name, entityType: "registration_group", entityId: groupId, payload: smsPayload, idempotencyKey: `${groupId}:registration-confirmed:sms` });
      const reminderAt = new Date(Math.max(Date.now(), new Date(firstSeat.webinar_starts_at).getTime() - 30 * 60_000)).toISOString();
      await queueSms({ client, templateSlug: "session-starting-soon", triggerKey: "session.starting_soon", recipientPhone: input.phone, recipientName: input.name, entityType: "registration_group", entityId: groupId, payload: smsPayload, scheduledAt: reminderAt, idempotencyKey: `${groupId}:session-starting-soon:sms` });
    }

    if (access.inviteId) {
      await client.query(
        "UPDATE webinar_invites SET redeemed_at = COALESCE(redeemed_at, $1) WHERE id = $2",
        [now, access.inviteId],
      );
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

export type GiveawayDrawTrigger = "manual" | "stream_ended";

export async function drawWinner(webinarId: string, drawnBy: string | null, triggerSource: GiveawayDrawTrigger = "manual"): Promise<RegistrationView> {
  return withTransaction(async (client) => {
    const webinarResult = await client.query<{
      id: string;
      title: string;
      timezone: string;
      giveaway_enabled: boolean | number;
      prize_product_name: string | null;
      prize_product_sku: string | null;
      prize_product_price_cents: number | string | null;
      claim_deadline: string | null;
      fulfillment_notes: string;
    }>(`SELECT id, title, timezone, giveaway_enabled, prize_product_name, prize_product_sku, prize_product_price_cents, claim_deadline, fulfillment_notes FROM webinars WHERE id = $1 FOR UPDATE`, [webinarId]);
    const webinar = webinarResult.rows[0];
    if (!webinar) throw new DomainError("The webinar could not be found.", 404);

    const existing = await client.query<{ registration_id: string }>(
      "SELECT registration_id FROM winner_draws WHERE webinar_id = $1", [webinarId]);
    if (existing.rows[0]) {
      const winner = (await registrationsForWebinar(webinarId, client)).find((registration) => registration.id === existing.rows[0].registration_id);
      if (winner) return winner;
      throw new DomainError("This webinar already has a winner draw.", 409);
    }

    const { rows: candidates } = await client.query<{ id: string; customer_name: string; customer_email: string }>(
      "SELECT id, customer_name, customer_email FROM registrations WHERE webinar_id = $1 AND payment_status IN ('free', 'paid') AND access_status = 'active' ORDER BY id FOR UPDATE", [webinarId]);
    if (candidates.length === 0) throw new DomainError("There are no eligible registrations for this draw.");

    const selected = candidates[randomInt(candidates.length)].id;
    const drawId = randomUUID();
    const now = new Date().toISOString();
    await client.query(`
      INSERT INTO winner_draws (id, webinar_id, registration_id, candidate_count, selection_method, drawn_by, trigger_source, created_at)
      VALUES ($1, $2, $3, $4, 'server-crypto-random-int', $5, $6, $7)
    `, [drawId, webinarId, selected, candidates.length, drawnBy, triggerSource, now]);
    await client.query("UPDATE registrations SET is_winner = (id = $1) WHERE webinar_id = $2", [selected, webinarId]);
    if (Boolean(webinar.giveaway_enabled)) {
      await client.query(`
        UPDATE registrations
        SET giveaway_outcome = CASE WHEN id = $1 THEN 'winner' ELSE 'not_winner' END,
            giveaway_result_at = $3,
            giveaway_prize_name = $4,
            giveaway_prize_sku = $5,
            giveaway_prize_value_cents = $6,
            giveaway_claim_deadline = $7,
            giveaway_fulfillment_notes = $8
        WHERE webinar_id = $2 AND payment_status IN ('free', 'paid') AND access_status = 'active'
      `, [selected, webinarId, now, webinar.prize_product_name, webinar.prize_product_sku, webinar.prize_product_price_cents === null ? null : Number(webinar.prize_product_price_cents), webinar.claim_deadline, webinar.fulfillment_notes]);
    }
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'winner.drawn', 'webinar', $3, $4, $5)
    `, [randomUUID(), drawnBy, webinarId, JSON.stringify({ candidateCount: candidates.length, selectionMethod: "server-crypto-random-int", triggerSource }), now]);

    const winner = (await registrationsForWebinar(webinarId, client)).find((registration) => registration.id === selected);
    if (!winner) throw new DomainError("The winner was recorded but could not be loaded.", 500);
    if (Boolean(webinar.giveaway_enabled)) {
      const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const claimDeadline = webinar.claim_deadline ? formatDateTime(webinar.claim_deadline, webinar.timezone) : "Contact the site team as soon as possible";
      const prizeName = webinar.prize_product_name ?? "the featured prize";
      await queueCorrespondence({
        client,
        templateSlug: "giveaway-winner",
        triggerKey: "winner.drawn",
        recipientEmail: winner.customerEmail,
        recipientName: winner.customerName,
        entityType: "registration",
        entityId: winner.id,
        payload: {
          winner_name: winner.customerName,
          session_title: webinar.title,
          prize_name: prizeName,
          prize_sku: webinar.prize_product_sku ?? "",
          claim_deadline: claimDeadline,
          fulfillment_notes: webinar.fulfillment_notes || "Contact the site team to confirm fulfillment details.",
          winner_link: `${appUrl}/account`,
        },
        idempotencyKey: `${webinarId}:${winner.id}:giveaway-winner`,
      });
      for (const candidate of candidates) {
        if (candidate.id === selected) continue;
        await queueCorrespondence({
          client,
          templateSlug: "giveaway-not-winner",
          triggerKey: "winner.drawn",
          recipientEmail: candidate.customer_email,
          recipientName: candidate.customer_name,
          entityType: "registration",
          entityId: candidate.id,
          payload: { customer_name: candidate.customer_name, session_title: webinar.title, prize_name: prizeName },
          idempotencyKey: `${webinarId}:${candidate.id}:giveaway-not-winner`,
        });
      }
    }
    if (winner.customerPhone && await hasSmsConsent(client, winner.id)) {
      await queueSms({ client, templateSlug: "winner-selected", triggerKey: "winner.drawn", recipientPhone: winner.customerPhone, recipientName: winner.customerName, entityType: "registration", entityId: winner.id, payload: { winner_name: winner.customerName, session_title: winner.webinarTitle, winner_link: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/account` }, idempotencyKey: `${winner.id}:winner-selected:sms` });
    }
    return winner;
  });
}

export async function processEndedWebinars(limit = 20): Promise<{ completed: number; drawn: number; pendingDraws: number }> {
  await assertStandaloneDataset();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const now = new Date().toISOString();
  const due = await getDb().query<{ id: string; giveaway_enabled: boolean | number }>(`
    SELECT id, giveaway_enabled
    FROM webinars
    WHERE status IN ('published', 'sold_out')
      AND starts_at::timestamptz + (duration_minutes * INTERVAL '1 minute') <= $1
    ORDER BY starts_at ASC
    LIMIT $2
  `, [now, safeLimit]);
  let completed = 0;
  let drawn = 0;
  let pendingDraws = 0;
  for (const webinar of due.rows) {
    const transitioned = await getDb().query<{ id: string }>(`
      UPDATE webinars
      SET status = 'completed', updated_at = $2
      WHERE id = $1 AND status IN ('published', 'sold_out')
      RETURNING id
    `, [webinar.id, now]);
    if (!transitioned.rows[0]) continue;
    completed += 1;
    if (!Boolean(webinar.giveaway_enabled)) continue;
    try {
      await drawWinner(webinar.id, null, "stream_ended");
      drawn += 1;
    } catch (error) {
      if (error instanceof DomainError && error.message === "There are no eligible registrations for this draw.") pendingDraws += 1;
      else throw error;
    }
  }
  return { completed, drawn, pendingDraws };
}

async function hasSmsConsent(client: Pick<DatabaseClient, "query">, registrationId: string): Promise<boolean> {
  const result = await client.query<{ sms_consent: boolean | number }>("SELECT sms_consent FROM registrations WHERE id = $1", [registrationId]);
  return Boolean(result.rows[0]?.sms_consent);
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
  visibility?: WebinarVisibility;
  pricingModel?: PricingModel;
  referenceValueCents?: number | null;
  roundingMode?: PricingRounding;
  giveawayEnabled?: boolean;
  prizeProductId?: string | null;
  claimDeadline?: string | null;
  fulfillmentNotes?: string;
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || `webinar-${Date.now()}`;
}

export function resolveTierPricing(input: CreateWebinarInput): {
  priceCents: number;
  pricingModel: PricingModel;
  referenceValueCents: number | null;
  roundingMode: PricingRounding;
} {
  const pricingModel = input.pricingModel ?? "fixed_per_seat";
  const roundingMode = input.roundingMode ?? "exact_cents";
  if (pricingModel === "fixed_per_seat") {
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
      throw new DomainError("Enter a valid per-seat price.");
    }
    return { priceCents: input.priceCents, pricingModel, referenceValueCents: null, roundingMode: "exact_cents" };
  }

  const referenceValueCents = input.referenceValueCents;
  if (typeof referenceValueCents !== "number" || !Number.isInteger(referenceValueCents) || referenceValueCents < 0) {
    throw new DomainError("Enter a valid total item value for split pricing.");
  }
  if (!["exact_cents", "nearest_dollar", "round_up_dollar"].includes(roundingMode)) {
    throw new DomainError("Choose a valid pricing rounding rule.");
  }
  const calculatedCents = referenceValueCents / input.capacity;
  const priceCents = roundingMode === "round_up_dollar"
    ? Math.ceil(calculatedCents / 100) * 100
    : roundingMode === "nearest_dollar"
      ? Math.round(calculatedCents / 100) * 100
      : Math.round(calculatedCents);
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || priceCents > 1_000_000) {
    throw new DomainError("The calculated seat price is outside the supported range.");
  }
  return { priceCents, pricingModel, referenceValueCents, roundingMode };
}

export async function createWebinar(input: CreateWebinarInput, actorId: string): Promise<WebinarDetails> {
  const webinarId = `webinar-${randomUUID()}`;
  const tierId = `${webinarId}-tier-primary`;
  const now = new Date().toISOString();
  const pricing = resolveTierPricing(input);
  const visibility = input.visibility ?? "public";
  const giveawayEnabled = Boolean(input.giveawayEnabled);
  const prizeProductId = giveawayEnabled ? input.prizeProductId ?? null : null;
  const claimDeadline = giveawayEnabled ? input.claimDeadline ?? null : null;
  const fulfillmentNotes = giveawayEnabled ? input.fulfillmentNotes?.trim() ?? "" : "";
  if (giveawayEnabled && !prizeProductId) throw new DomainError("Choose one catalog product for the session prize.");
  const webinar = await withTransaction(async (client) => {
    const prize = giveawayEnabled ? await client.query<{ id: string; name: string; sku: string; price_cents: number | string }>("SELECT id, name, sku, price_cents FROM products WHERE id = $1 AND status = 'active'", [prizeProductId]) : null;
    if (giveawayEnabled && !prize?.rows[0]) throw new DomainError("Choose an active catalog product for the session prize.");
    const prizeSnapshot = prize?.rows[0];
    let slug = slugify(input.title);
    const existing = await client.query("SELECT id FROM webinars WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) slug = `${slug}-${randomUUID().slice(0, 6)}`;

    await client.query(`
      INSERT INTO webinars
        (id, slug, title, eyebrow, description, long_description, starts_at,
         duration_minutes, timezone, status, provider, host_name, host_bio,
         replay_label, replay_url, accent, visibility, giveaway_enabled, prize_product_id,
         prize_product_name, prize_product_sku, prize_product_price_cents, claim_deadline,
         fulfillment_notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9,
        'Manual meeting', $10, $11, 'Replay planned', NULL, 'teal', $12, $13, $14, $15, $16, $17, $18, $19, $20, $20)
    `, [webinarId, slug, input.title, input.eyebrow, input.description,
      new Date(input.startsAt).toISOString(), input.durationMinutes, input.timezone, input.status,
      input.hostName, "A new host profile is ready to be filled in from the admin console.", visibility,
      giveawayEnabled, prizeProductId, prizeSnapshot?.name ?? null, prizeSnapshot?.sku ?? null, prizeSnapshot ? Number(prizeSnapshot.price_cents) : null, claimDeadline, fulfillmentNotes, now]);
    await client.query(
      "INSERT INTO tiers (id, webinar_id, name, price_cents, capacity, pricing_model, reference_value_cents, rounding_mode, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)",
      [tierId, webinarId, input.tierName, pricing.priceCents, input.capacity, pricing.pricingModel, pricing.referenceValueCents, pricing.roundingMode]);
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

export async function updateWebinar(webinarId: string, input: CreateWebinarInput, actorId: string): Promise<WebinarDetails> {
  const now = new Date().toISOString();
  const pricing = resolveTierPricing(input);
  const visibility = input.visibility ?? "public";
  const giveawayEnabled = Boolean(input.giveawayEnabled);
  const prizeProductId = giveawayEnabled ? input.prizeProductId ?? null : null;
  const claimDeadline = giveawayEnabled ? input.claimDeadline ?? null : null;
  const fulfillmentNotes = giveawayEnabled ? input.fulfillmentNotes?.trim() ?? "" : "";
  if (giveawayEnabled && !prizeProductId) throw new DomainError("Choose one catalog product for the session prize.");
  await withTransaction(async (client) => {
    const currentResult = await client.query<{ tier_id: string; capacity: number | string; price_cents: number | string; giveaway_enabled: boolean | number; prize_product_id: string | null; prize_product_name: string | null; prize_product_sku: string | null; prize_product_price_cents: number | string | null }>(`
      SELECT t.id AS tier_id, t.capacity, t.price_cents, w.giveaway_enabled, w.prize_product_id, w.prize_product_name, w.prize_product_sku, w.prize_product_price_cents
      FROM webinars w JOIN tiers t ON t.webinar_id = w.id
      WHERE w.id = $1 ORDER BY t.sort_order ASC LIMIT 1 FOR UPDATE OF w, t
    `, [webinarId]);
    const current = currentResult.rows[0];
    if (!current) throw new DomainError("The webinar could not be found.", 404);
    const currentCapacity = Number(current.capacity);
    const currentPrice = Number(current.price_cents);
    const registrationCount = await client.query<{ count: number | string }>("SELECT COUNT(*)::int AS count FROM registrations WHERE webinar_id = $1", [webinarId]);
    const occupiedSeats = await client.query<{ count: number | string }>("SELECT COUNT(*)::int AS count FROM seats WHERE tier_id = $1 AND status <> 'available'", [current.tier_id]);
    if (Number(registrationCount.rows[0]?.count ?? 0) > 0 && (input.capacity !== currentCapacity || pricing.priceCents !== currentPrice)) {
      throw new DomainError("Seat capacity and pricing are locked after the first registration.", 409);
    }
    if (input.capacity !== currentCapacity && Number(occupiedSeats.rows[0]?.count ?? 0) > 0) {
      throw new DomainError("Capacity can only change while all seats are available.", 409);
    }
    const prize = giveawayEnabled ? await client.query<{ id: string; name: string; sku: string; price_cents: number | string }>("SELECT id, name, sku, price_cents FROM products WHERE id = $1 AND status = 'active'", [prizeProductId]) : null;
    if (giveawayEnabled && !prize?.rows[0]) throw new DomainError("Choose an active catalog product for the session prize.");
    const prizeSnapshot = prize?.rows[0];
    const existingDraw = await client.query("SELECT id FROM winner_draws WHERE webinar_id = $1", [webinarId]);
    if (existingDraw.rows[0] && (giveawayEnabled !== Boolean(current.giveaway_enabled) || prizeProductId !== current.prize_product_id)) {
      throw new DomainError("The prize cannot be changed after the raffle has been drawn.", 409);
    }
    await client.query(`
      UPDATE webinars
      SET title = $2, eyebrow = $3, description = $4, long_description = $4,
          starts_at = $5, duration_minutes = $6, timezone = $7, status = $8,
          host_name = $9, visibility = $10, giveaway_enabled = $11, prize_product_id = $12,
          prize_product_name = $13, prize_product_sku = $14, prize_product_price_cents = $15,
          claim_deadline = $16, fulfillment_notes = $17, updated_at = $18
      WHERE id = $1
    `, [webinarId, input.title.trim(), input.eyebrow.trim(), input.description.trim(), new Date(input.startsAt).toISOString(), input.durationMinutes, input.timezone, input.status, input.hostName.trim(), visibility, giveawayEnabled, prizeProductId, prizeSnapshot?.name ?? null, prizeSnapshot?.sku ?? null, prizeSnapshot ? Number(prizeSnapshot.price_cents) : null, claimDeadline, fulfillmentNotes, now]);
    await client.query(`
      UPDATE tiers
      SET name = $2, price_cents = $3, capacity = $4, pricing_model = $5,
          reference_value_cents = $6, rounding_mode = $7
      WHERE id = $1
    `, [current.tier_id, input.tierName.trim(), pricing.priceCents, input.capacity, pricing.pricingModel, pricing.referenceValueCents, pricing.roundingMode]);
    if (input.capacity < currentCapacity) {
      await client.query("DELETE FROM seats WHERE tier_id = $1 AND seat_number > $2", [current.tier_id, input.capacity]);
    } else if (input.capacity > currentCapacity) {
      await client.query(`
        INSERT INTO seats (id, tier_id, seat_number, status)
        SELECT $1 || '-seat-' || n::text, $1, n, 'available'
        FROM generate_series($2::int + 1, $3::int) AS n
      `, [current.tier_id, currentCapacity, input.capacity]);
    }
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'webinar.updated', 'webinar', $3, $4, $5)
    `, [randomUUID(), actorId, webinarId, JSON.stringify({ visibility, status: input.status, synthetic: true }), now]);
  });
  const result = await getWebinarById(webinarId);
  if (!result) throw new DomainError("The webinar was updated but could not be loaded.", 500);
  return result;
}

export async function cleanupExpiredHolds(): Promise<number> {
  await assertStandaloneDataset();
  const { rowCount } = await getDb().query(`
    UPDATE seats
    SET status = 'available', hold_token_hash = NULL, hold_expires_at = NULL
    WHERE status = 'held' AND hold_expires_at <= $1
  `, [new Date().toISOString()]);
  return rowCount ?? 0;
}
