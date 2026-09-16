import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("synthetic webinar domain protects inventory and attendee boundaries", async () => {
  const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "webinar-studio-test-"));
  const fixturePath = path.join(fixtureDirectory, "webinar.sqlite");
  Object.assign(process.env, {
    NODE_ENV: "development",
    DEMO_MODE: "true",
    ALLOW_DEMO_SEED: "true",
    DATABASE_PATH: fixturePath,
  });

  let database: { close: () => void } | null = null;
  try {
    const { getDb } = await import("@/lib/db");
    const {
      completeRegistration,
      createSeatHold,
      DomainError,
      getCustomerRegistrations,
      getCustomerReplayAccess,
      getPublicWebinars,
      getWebinarBySlug,
      getPublicWebinarBySlug,
    } = await import("@/lib/data");
    database = getDb();

    const publicWebinars = getPublicWebinars();
    assert.equal(publicWebinars.length, 2);
    assert.equal("revenueCents" in publicWebinars[0], false);

    const published = getPublicWebinarBySlug("operations-readiness-briefing");
    assert.ok(published);
    const availableSeat = published.tiers.flatMap((tier) => tier.seats).find((seat) => seat.status === "available");
    assert.ok(availableSeat);

    const hold = createSeatHold(published.id, [availableSeat.id]);
    assert.equal(hold.seats.length, 1);
    const registration = completeRegistration({
      webinarId: published.id,
      holdToken: hold.holdToken,
      name: "Synthetic Test Attendee",
      email: "synthetic.test@example.test",
      phone: "+1 555 010 0199",
      consent: false,
    });
    assert.equal(registration.registrationIds.length, 1);

    assert.throws(() => createSeatHold(published.id, [availableSeat.id]), (error: unknown) => error instanceof DomainError && /already sold/.test(error.message));

    const draft = getWebinarBySlug("incident-response-tabletop");
    assert.ok(draft);
    const draftSeat = draft.tiers.flatMap((tier) => tier.seats).find((seat) => seat.status === "available");
    assert.ok(draftSeat);
    assert.throws(() => createSeatHold(draft.id, [draftSeat.id]), (error: unknown) => error instanceof DomainError && error.statusCode === 409);

    const attendeeRegistrations = getCustomerRegistrations("user_demo_attendee");
    assert.equal(attendeeRegistrations.length, 1);
    assert.ok(getCustomerReplayAccess("user_demo_attendee", attendeeRegistrations[0].id));
    assert.equal(getCustomerReplayAccess("user_demo_admin", attendeeRegistrations[0].id), null);
  } finally {
    database?.close();
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});
