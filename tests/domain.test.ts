import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { DatabaseClient, DatabasePool, DatabaseRow, QueryResult } from "@/lib/db";

test("standalone webinar domain keeps inventory, registrations, and attendee access consistent", async () => {
  Object.assign(process.env, { NODE_ENV: "test", DEMO_MODE: "true" });
  const postgres = new PGlite();

  const query = async <Row extends DatabaseRow>(sql: string, values: unknown[] = []): Promise<QueryResult<Row>> => {
    const result = await postgres.query(sql, values as never[]);
    return {
      rows: result.rows as Row[],
      rowCount: result.affectedRows ?? result.rows.length,
    };
  };
  const client: DatabaseClient = { query, release: () => undefined };
  const pool: DatabasePool = { query, connect: async () => client, end: () => postgres.close() };

  try {
    const { getDb, setTestDatabase } = await import("@/lib/db");
    setTestDatabase(pool);
    const { runMigrations } = await import("@/lib/migrations");
    const { seedSyntheticSamples } = await import("@/lib/sample-seed");
    await runMigrations(getDb());
    assert.deepEqual(await runMigrations(getDb()), []);
    const seeded = await seedSyntheticSamples();
    assert.deepEqual(seeded, { webinars: 3, registrations: 5, alreadySeeded: false });
    assert.deepEqual(await seedSyntheticSamples(), { webinars: 3, registrations: 5, alreadySeeded: true });

    await getDb().query(
      "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ($1, $2, $3, 'admin', $4, NOW()::text)",
      ["user_test_admin", "admin@example.test", "Test Admin", "test-only-hash"],
    );
    await getDb().query(
      "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ($1, $2, $3, 'attendee', $4, NOW()::text)",
      ["user_test_attendee", "attendee@example.test", "Test Attendee", "test-only-hash"],
    );
    await getDb().query("UPDATE registrations SET user_id = 'user_test_attendee' WHERE id = 'registration-demo-1'");
    const { enforceRateLimit, RateLimitError } = await import("@/lib/rate-limit");
    await enforceRateLimit("test-login", "192.0.2.10", 2, 60_000);
    await enforceRateLimit("test-login", "192.0.2.10", 2, 60_000);
    await assert.rejects(
      enforceRateLimit("test-login", "192.0.2.10", 2, 60_000),
      (error: unknown) => error instanceof RateLimitError && error.retryAfterSeconds > 0,
    );

    const {
      completeRegistration,
      createSeatHold,
      DomainError,
      getCustomerRegistrations,
      getCustomerReplayAccess,
      getPublicWebinars,
      getWebinarBySlug,
      getPublicWebinarBySlug,
      getDashboardData,
      drawWinner,
      createWebinar,
    } = await import("@/lib/data");

    const publicWebinars = await getPublicWebinars();
    assert.equal(publicWebinars.length, 2);
    assert.equal("revenueCents" in publicWebinars[0], false);

    const dashboard = await getDashboardData();
    assert.equal(dashboard.stats.registrations, 5);
    assert.equal(dashboard.stats.revenueCents, 38_100);

    const published = await getPublicWebinarBySlug("operations-readiness-briefing");
    assert.ok(published);
    const availableSeat = published.tiers.flatMap((tier) => tier.seats).find((seat) => seat.status === "available");
    assert.ok(availableSeat);

    const hold = await createSeatHold(published.id, [availableSeat.id]);
    assert.equal(hold.seats.length, 1);
    await assert.rejects(
      createSeatHold(published.id, [availableSeat.id]),
      (error: unknown) => error instanceof DomainError && /being held/.test(error.message),
    );

    const registration = await completeRegistration({
      webinarId: published.id,
      holdToken: hold.holdToken,
      name: "Synthetic Test Attendee",
      email: "synthetic.test@example.test",
      phone: "+1 555 010 0199",
      consent: false,
    });
    assert.equal(registration.registrationIds.length, 1);
    await assert.rejects(
      createSeatHold(published.id, [availableSeat.id]),
      (error: unknown) => error instanceof DomainError && /already sold/.test(error.message),
    );

    const draft = await getWebinarBySlug("incident-response-tabletop");
    assert.ok(draft);
    const draftSeat = draft.tiers.flatMap((tier) => tier.seats).find((seat) => seat.status === "available");
    assert.ok(draftSeat);
    await assert.rejects(
      createSeatHold(draft.id, [draftSeat.id]),
      (error: unknown) => error instanceof DomainError && error.statusCode === 409,
    );

    const attendeeRegistrations = await getCustomerRegistrations("user_test_attendee");
    assert.equal(attendeeRegistrations.length, 1);
    assert.ok(await getCustomerReplayAccess("user_test_attendee", attendeeRegistrations[0].id));
    assert.equal(await getCustomerReplayAccess("user_test_admin", attendeeRegistrations[0].id), null);

    const winner = await drawWinner("webinar-operations-readiness", "user_test_admin");
    assert.equal(winner.isWinner, true);
    assert.ok(winner.id.startsWith("registration-demo-") || registration.registrationIds.includes(winner.id));

    const managed = await createWebinar({
      title: "Synthetic Management Test",
      eyebrow: "Operations test",
      description: "A synthetic webinar used to verify the database-backed create workflow.",
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      timezone: "America/Chicago",
      durationMinutes: 60,
      hostName: "Test Host",
      tierName: "General admission",
      priceCents: 2500,
      capacity: 3,
      status: "draft",
    }, "user_test_admin");
    assert.equal(managed.capacity, 3);
    assert.equal(managed.timezone, "America/Chicago");
    assert.equal(managed.tiers[0].seats.length, 3);
  } finally {
    await postgres.close();
  }
});
