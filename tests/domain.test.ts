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
      getPrivateWebinarBySlug,
      getDashboardData,
      drawWinner,
      createWebinar,
      createWebinarInvites,
    } = await import("@/lib/data");
    const { generateInviteCode, hashInviteCode, normalizeInviteCode, normalizeInviteEmail } = await import("@/lib/private-access-core");

    const inviteCode = generateInviteCode();
    assert.match(inviteCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(normalizeInviteCode(inviteCode), inviteCode.replace("-", ""));
    assert.equal(normalizeInviteEmail("  Attendee@Example.TEST "), "attendee@example.test");
    assert.notEqual(hashInviteCode(inviteCode), inviteCode);

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

    const { resolveTierPricing } = await import("@/lib/data");
    const pricingInput = {
      title: "Pricing test",
      eyebrow: "Test",
      description: "A pricing test webinar.",
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      timezone: "America/Chicago",
      durationMinutes: 60,
      hostName: "Test Host",
      tierName: "Seat",
      priceCents: 0,
      capacity: 1,
      status: "draft" as const,
    };
    assert.deepEqual(resolveTierPricing({ ...pricingInput, pricingModel: "split_total_value", referenceValueCents: 798, roundingMode: "round_up_dollar" }), {
      priceCents: 800,
      pricingModel: "split_total_value",
      referenceValueCents: 798,
      roundingMode: "round_up_dollar",
    });
    assert.deepEqual(resolveTierPricing({ ...pricingInput, pricingModel: "split_total_value", referenceValueCents: 45_000, capacity: 6, roundingMode: "exact_cents" }), {
      priceCents: 7500,
      pricingModel: "split_total_value",
      referenceValueCents: 45_000,
      roundingMode: "exact_cents",
    });

    const privateWebinar = await createWebinar({
      ...pricingInput,
      title: "Synthetic Private Access Test",
      visibility: "private",
      status: "published",
      capacity: 2,
      priceCents: 500,
    }, "user_test_admin");
    const generatedInvites = await createWebinarInvites(privateWebinar.id, [" Private.Attendee@example.test ", "second@example.test" ], "user_test_admin");
    assert.equal(generatedInvites.length, 2);
    assert.equal(generatedInvites[0].email, "private.attendee@example.test");
    assert.match(generatedInvites[0].code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const storedInvite = await getDb().query<{ email: string; code_hash: string }>(
      "SELECT email, code_hash FROM webinar_invites WHERE webinar_id = $1 AND email = $2",
      [privateWebinar.id, generatedInvites[0].email],
    );
    assert.equal(storedInvite.rows[0]?.email, generatedInvites[0].email);
    assert.equal(storedInvite.rows[0]?.code_hash, hashInviteCode(generatedInvites[0].code));

    const { verifyPrivateInvite } = await import("@/lib/private-access");
    const verifiedInvite = await verifyPrivateInvite(privateWebinar.slug, generatedInvites[0].email, generatedInvites[0].code);
    assert.ok(verifiedInvite);
    assert.equal(verifiedInvite.webinarId, privateWebinar.id);
    assert.equal(verifiedInvite.email, generatedInvites[0].email);
    assert.equal(await verifyPrivateInvite(privateWebinar.slug, "wrong@example.test", generatedInvites[0].code), null);
    assert.equal(await verifyPrivateInvite("not-a-private-webinar", generatedInvites[0].email, generatedInvites[0].code), null);

    const privateDetails = await getPrivateWebinarBySlug(privateWebinar.slug, verifiedInvite.accessToken);
    assert.ok(privateDetails);
    assert.equal(await getPrivateWebinarBySlug(privateWebinar.slug, null), null);
    await assert.rejects(
      createWebinarInvites(published.id, ["not-private@example.test"], "user_test_admin"),
      (error: unknown) => error instanceof DomainError && /only be created for private webinars/.test(error.message),
    );

    await getDb().query("UPDATE system_metadata SET value = 'imported' WHERE key = 'dataset_origin'");
    await assert.rejects(
      getPublicWebinars(),
      (error: unknown) => error instanceof Error && /refuses to serve imported legacy data/.test(error.message),
    );
  } finally {
    await postgres.close();
  }
});
