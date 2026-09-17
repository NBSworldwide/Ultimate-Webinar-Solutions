import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { DatabaseClient, DatabasePool, DatabaseRow, QueryResult } from "@/lib/db";
import { hasCapability } from "@/lib/authorization";

test("page-builder HTML is sanitized while useful formatting and media remain", async () => {
  const { sanitizeHtml } = await import("@/lib/sanitize-html");
  const sanitized = sanitizeHtml('<p onclick="alert(1)"><u>Safe copy</u><img src="https://images.example.test/demo.jpg" alt="Demo" /></p><script>alert(2)</script><iframe src="https://evil.example.test/embed"></iframe>');
  assert.match(sanitized, /<p><u>Safe copy<\/u><img src="https:\/\/images\.example\.test\/demo\.jpg" alt="Demo" \/><\/p>/);
  assert.doesNotMatch(sanitized, /onclick|script|evil\.example/);
});

test("role capabilities keep administrator, manager, and customer boundaries distinct", () => {
  const admin = { role: "admin" as const };
  const manager = { role: "manager" as const };
  const customer = { role: "attendee" as const };

  assert.equal(hasCapability(admin, "settings.manage"), true);
  assert.equal(hasCapability(admin, "team.manage"), true);
  assert.equal(hasCapability(manager, "content.manage"), true);
  assert.equal(hasCapability(manager, "webinars.manage"), true);
  assert.equal(hasCapability(manager, "catalog.manage"), true);
  assert.equal(hasCapability(manager, "orders.manage"), true);
  assert.equal(hasCapability(manager, "email.manage"), true);
  assert.equal(hasCapability(manager, "appearance.manage"), true);
  assert.equal(hasCapability(manager, "settings.manage"), false);
  assert.equal(hasCapability(manager, "team.manage"), false);
  assert.equal(hasCapability(customer, "admin.access"), false);
  assert.equal(hasCapability(customer, "orders.manage"), false);
});

test("Google Maps blocks accept addresses and range-checked coordinates", async () => {
  const { hasMapCoordinateInput, normalizeMapLocation } = await import("@/lib/map-location");
  const address = normalizeMapLocation({ locationMode: "address", address: " 123 Main Street, Arlington, TX 76014 ", zoom: 10 });
  assert.deepEqual(address, { mode: "address", query: "123 Main Street, Arlington, TX 76014", label: "123 Main Street, Arlington, TX 76014" });

  const coordinates = { locationMode: "coordinates", latitude: "32.7357", longitude: "-97.1081" };
  assert.equal(hasMapCoordinateInput(coordinates), true);
  assert.deepEqual(normalizeMapLocation(coordinates), { mode: "coordinates", query: "32.7357,-97.1081", label: "32.7357,-97.1081", latitude: 32.7357, longitude: -97.1081 });
  assert.equal(normalizeMapLocation({ locationMode: "coordinates", latitude: "91", longitude: "-97.1081" }), null);
});

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
    const { createAttendeeAccount } = await import("@/lib/auth");
    const testCustomer = await createAttendeeAccount({ name: "Synthetic Checkout Customer", email: "checkout.customer@example.test", password: "synthetic-test-password" });
    const privateCustomer = await createAttendeeAccount({ name: "Synthetic Private Customer", email: "free.private@example.test", password: "synthetic-private-password" });
    assert.equal(testCustomer.role, "attendee");
    const { createManagerAccount, getTeamUsers, updateTeamUserRole, TeamAccountError } = await import("@/lib/team");
    const managerUser = await createManagerAccount({ name: "Synthetic Manager", email: "manager@example.test", password: "synthetic-manager-password" }, "user_test_admin");
    assert.equal(managerUser.role, "manager");
    assert.equal((await getTeamUsers()).some((user) => user.id === managerUser.id && user.role === "manager"), true);
    await updateTeamUserRole(managerUser.id, "attendee", "user_test_admin");
    assert.equal((await getTeamUsers()).find((user) => user.id === managerUser.id)?.role, "attendee");
    await updateTeamUserRole(managerUser.id, "manager", "user_test_admin");
    await assert.rejects(updateTeamUserRole("user_test_admin", "manager", "user_test_admin"), (error: unknown) => error instanceof TeamAccountError && /own role/.test(error.message));
    const { getSiteSettings, updateSiteSettings } = await import("@/lib/site-settings");
    const defaultSiteSettings = await getSiteSettings();
    assert.equal(defaultSiteSettings.displayName, "Webinar Studio");
    const savedSiteSettings = await updateSiteSettings({
      displayName: "Demo Operations Co.", legalName: "Demo Operations Co. LLC", tagline: "Practical live learning for modern teams.", description: "A synthetic company profile used to verify reusable site identity settings.",
      logoUrl: "/demo-logo.svg", logoAlt: "Demo Operations Co.", primaryEmail: "hello@example.test", supportEmail: "support@example.test", phone: "+1 555 010 0142",
      addressLine1: "100 Demo Way", addressLine2: "Suite 200", city: "Arlington", region: "TX", postalCode: "76014", country: "US", websiteUrl: "https://example.test",
      timezone: "America/Chicago", currency: "USD", supportUrl: "https://example.test/support", privacyUrl: "https://example.test/privacy", termsUrl: "https://example.test/terms", shippingPolicyUrl: "https://example.test/shipping", businessHours: "Monday-Friday, 9 AM-5 PM Central",
      linkedinUrl: "https://linkedin.com/company/example", facebookUrl: "", instagramUrl: "https://instagram.com/example",
    }, "user_test_admin");
    assert.equal(savedSiteSettings.displayName, "Demo Operations Co.");
    assert.deepEqual((await getSiteSettings()).addressLine1, "100 Demo Way");
    const { getIntegrationSettings, updateIntegrationSettings } = await import("@/lib/integrations");
    const previousIntegrationKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    const previousSessionSecret = process.env.SESSION_SECRET;
    process.env.INTEGRATION_ENCRYPTION_KEY = "test-only-integration-key-with-32-characters";
    const savedIntegrations = await updateIntegrationSettings({
      streamingProvider: "cloudflare_stream",
      emailProvider: "resend",
      streamingValues: { accountId: "cloudflare-account-test", apiToken: "stream-secret-test", webhookSecret: "" },
      emailValues: { apiKey: "resend-secret-test", fromEmail: "Webinars <hello@example.test>", replyTo: "" },
    }, "user_test_admin");
    assert.equal(savedIntegrations.streamingProvider, "cloudflare_stream");
    assert.equal(savedIntegrations.emailProvider, "resend");
    assert.equal(savedIntegrations.streamingValues.accountId, "cloudflare-account-test");
    assert.ok(savedIntegrations.savedStreamingSecrets.includes("apiToken"));
    assert.ok(savedIntegrations.savedEmailSecrets.includes("apiKey"));
    assert.equal(savedIntegrations.streamingValues.apiToken, undefined);
    assert.equal((await getIntegrationSettings()).emailValues.fromEmail, "Webinars <hello@example.test>");
    process.env.INTEGRATION_ENCRYPTION_KEY = previousIntegrationKey;
    process.env.SESSION_SECRET = previousSessionSecret;
    const { createPage, deletePage, getPages, getPublishedPageBySlug, updatePage } = await import("@/lib/pages");
    const { createNavigationMenu, getNavigationMenu, getNavigationMenus, updateNavigationMenu } = await import("@/lib/navigation");
    const samplePages = await getPages({ status: "published" });
    assert.equal(samplePages.length, 2);
    assert.equal((await getPublishedPageBySlug("about-webinar-studio"))?.title, "About Webinar Studio");
    const primaryMenu = (await getNavigationMenus()).find((menu) => menu.slug === "primary-navigation");
    assert.ok(primaryMenu);
    assert.equal(primaryMenu.autoAddPublishedPages, true);
    assert.deepEqual(primaryMenu.locations.sort(), ["header", "mobile"]);
    assert.ok(primaryMenu.items.some((item) => item.itemType === "page" && item.entityId === "page-demo-about" && item.isVisible));
    const editablePage = await createPage({
      slug: "editor-lifecycle-check", title: "Editor lifecycle check", excerpt: "A synthetic page used to verify the visual editor lifecycle.", status: "draft",
      blocks: [{ type: "hero", data: { heading: "Draft content", body: "This content is synthetic." } }], seoTitle: "", seoDescription: "",
    }, "user_test_admin");
    assert.equal(editablePage.status, "draft");
    await assert.rejects(deletePage(editablePage.id, "user_test_admin"), /Archive a page/);
    const publishedPage = await updatePage(editablePage.id, {
      slug: editablePage.slug, title: editablePage.title, excerpt: editablePage.excerpt, status: "published", blocks: [...editablePage.blocks, { type: "cta", data: { heading: "Continue", buttonLabel: "Browse", buttonHref: "/webinars" } }], seoTitle: "Lifecycle check", seoDescription: "A synthetic published page.",
    }, "user_test_admin");
    assert.equal(publishedPage.status, "published");
    assert.equal((await getPublishedPageBySlug(editablePage.slug))?.blocks.length, 2);
    const publishedMenu = await getNavigationMenu(primaryMenu.id);
    assert.ok(publishedMenu?.items.some((item) => item.itemType === "page" && item.entityId === editablePage.id && item.href === `/pages/${editablePage.slug}` && item.isVisible));
    const archivedPage = await updatePage(editablePage.id, { slug: editablePage.slug, title: editablePage.title, excerpt: editablePage.excerpt, status: "archived", blocks: publishedPage.blocks, seoTitle: publishedPage.seoTitle, seoDescription: publishedPage.seoDescription }, "user_test_admin");
    assert.equal(archivedPage.status, "archived");
    const archivedMenu = await getNavigationMenu(primaryMenu.id);
    assert.equal(archivedMenu?.items.find((item) => item.itemType === "page" && item.entityId === editablePage.id)?.isVisible, false);
    await deletePage(editablePage.id, "user_test_admin");
    assert.equal((await getPages({ query: "editor-lifecycle-check" })).some((item) => item.id === editablePage.id), false);
    assert.equal((await getNavigationMenu(primaryMenu.id))?.items.some((item) => item.itemType === "page" && item.entityId === editablePage.id), false);
    const customMenu = await createNavigationMenu({ name: "Synthetic campaign menu", locations: ["footer"], autoAddPublishedPages: false }, "user_test_admin");
    const nestedMenu = await updateNavigationMenu(customMenu.id, {
      name: customMenu.name,
      locations: customMenu.locations,
      autoAddPublishedPages: customMenu.autoAddPublishedPages,
      items: [
        { id: "navigation-test-parent", label: "Resources", href: "/pages/about-webinar-studio", itemType: "custom", entityId: null },
        { id: "navigation-test-child", parentId: "navigation-test-parent", label: "Catalog", href: "/products", itemType: "system", entityId: "shop" },
      ],
    }, "user_test_admin");
    assert.equal(nestedMenu.items.find((item) => item.id === "navigation-test-child")?.parentId, "navigation-test-parent");
    await assert.rejects(updateNavigationMenu(customMenu.id, { name: customMenu.name, locations: customMenu.locations, autoAddPublishedPages: false, items: [{ id: "unsafe", label: "Unsafe", href: "javascript:alert(1)", itemType: "custom", entityId: null }] }, "user_test_admin"), /safe internal path/);
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
      getRecentRegistrations,
      getWebinars,
      getPublicWebinars,
      getWebinarBySlug,
      getPublicWebinarBySlug,
      getSeatAvailability,
      getPrivateWebinarBySlug,
      getPrivateWebinarRoomBySlug,
      getDashboardData,
      drawWinner,
      processEndedWebinars,
      createWebinar,
      updateWebinar,
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
    assert.equal((await getWebinars(false, { query: "readiness", status: "published", visibility: "public" })).length, 1);
    assert.equal((await getWebinars(false, { status: "draft" })).length, 1);
    assert.equal((await getRecentRegistrations(40, { query: "Avery", paymentStatus: "paid", accessStatus: "active" })).length, 1);

    const dashboard = await getDashboardData();
    assert.equal(dashboard.stats.registrations, 5);
    assert.equal(dashboard.stats.revenueCents, 38_100);

    const published = await getPublicWebinarBySlug("operations-readiness-briefing");
    assert.ok(published);
    const availableSeat = published.tiers.flatMap((tier) => tier.seats).find((seat) => seat.status === "available");
    assert.ok(availableSeat);

    const hold = await createSeatHold(published.id, [availableSeat.id]);
    assert.equal(hold.seats.length, 1);
    const availabilityWhileHeld = await getSeatAvailability(published.id);
    assert.equal(availabilityWhileHeld?.tiers.flatMap((tier) => tier.seats).find((seat) => seat.id === availableSeat.id)?.status, "held");
    await assert.rejects(
      createSeatHold(published.id, [availableSeat.id]),
      (error: unknown) => error instanceof DomainError && /being held/.test(error.message),
    );

    await assert.rejects(
      completeRegistration({ webinarId: published.id, holdToken: hold.holdToken, name: "Unauthenticated Attendee", email: "unauthenticated@example.test", phone: "+1 555 010 0198", consent: false }),
      (error: unknown) => error instanceof DomainError && error.statusCode === 401,
    );

    const registration = await completeRegistration({
      webinarId: published.id,
      holdToken: hold.holdToken,
      name: "Synthetic Test Attendee",
      email: "synthetic.test@example.test",
      phone: "+1 555 010 0199",
      consent: false,
      userId: testCustomer.id,
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
    const managedSlug = managed.slug;
    const updatedManaged = await updateWebinar(managed.id, {
      title: "Synthetic Management Test Updated",
      eyebrow: "Operations test",
      description: "An updated synthetic webinar used to verify the database-backed edit workflow.",
      startsAt: new Date(Date.now() + 172_800_000).toISOString(),
      timezone: "America/Chicago",
      durationMinutes: 75,
      hostName: "Updated Test Host",
      tierName: "General admission",
      priceCents: 2500,
      capacity: 4,
      status: "published",
    }, "user_test_admin");
    assert.equal(updatedManaged.slug, managedSlug);
    assert.equal(updatedManaged.status, "published");
    assert.equal(updatedManaged.tiers[0].seats.length, 4);

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
    assert.equal((await getWebinars(false, { visibility: "private" })).length, 1);
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

    const freePublic = await createWebinar({
      ...pricingInput,
      title: "Synthetic Free Public Session",
      visibility: "public",
      status: "published",
      capacity: 2,
      priceCents: 0,
    }, "user_test_admin");
    const freePublicSeat = freePublic.tiers[0]?.seats.find((seat) => seat.status === "available");
    assert.ok(freePublicSeat);
    const freePublicHold = await createSeatHold(freePublic.id, [freePublicSeat.id]);
    const previousVercelEnvironment = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    const freeRegistration = await completeRegistration({
      webinarId: freePublic.id,
      holdToken: freePublicHold.holdToken,
      name: "Free Public Attendee",
      email: "free.public@example.test",
      phone: "+1 555 010 3301",
      consent: true,
      smsConsent: true,
      userId: testCustomer.id,
    });
    process.env.VERCEL_ENV = previousVercelEnvironment;
    const freeRegistrationRow = await getDb().query<{ payment_status: string }>("SELECT payment_status FROM registrations WHERE id = $1", [freeRegistration.registrationIds[0]]);
    assert.equal(freeRegistrationRow.rows[0]?.payment_status, "free");
    const freeWinner = await drawWinner(freePublic.id, "user_test_admin");
    assert.equal(freeWinner.isWinner, true);

    const freePrivate = await createWebinar({
      ...pricingInput,
      title: "Synthetic Free Private Session",
      visibility: "private",
      status: "published",
      capacity: 1,
      priceCents: 0,
    }, "user_test_admin");
    const freePrivateInvite = await createWebinarInvites(freePrivate.id, ["free.private@example.test"], "user_test_admin");
    const freePrivateAccess = await verifyPrivateInvite(freePrivate.slug, freePrivateInvite[0].email, freePrivateInvite[0].code);
    assert.ok(freePrivateAccess);
    const freePrivateSeat = freePrivate.tiers[0]?.seats.find((seat) => seat.status === "available");
    assert.ok(freePrivateSeat);
    const freePrivateHold = await createSeatHold(freePrivate.id, [freePrivateSeat.id], freePrivateAccess.accessToken);
    process.env.VERCEL_ENV = "production";
    await completeRegistration({ webinarId: freePrivate.id, holdToken: freePrivateHold.holdToken, name: "Free Private Attendee", email: freePrivateInvite[0].email, phone: "+1 555 010 3302", consent: false, userId: privateCustomer.id, privateAccessToken: freePrivateAccess.accessToken });
    process.env.VERCEL_ENV = previousVercelEnvironment;
    const freePrivateRoom = await getPrivateWebinarRoomBySlug(freePrivate.slug, freePrivateAccess.accessToken);
    assert.equal(freePrivateRoom?.registered, true);

    const { getCrmContact, updateCrmContact } = await import("@/lib/crm");
    const { getSmsOutbox, getSmsTemplates, normalizeSmsPhone, processDueSms, renderSmsTemplate } = await import("@/lib/sms");
    const { getEmailOutbox, getEmailSequences, getEmailTemplateRevisions, getEmailTemplates, renderEmailTemplate, updateEmailSequence, updateEmailTemplate } = await import("@/lib/email");
    assert.equal((await getEmailTemplates()).length, 8);
    assert.equal((await getEmailSequences()).length, 2);
    const freeContact = await getCrmContact("crm-contact-667265652e7075626c6963406578616d706c652e74657374");
    assert.ok(freeContact);
    assert.equal(freeContact.lifecycleStage, "attendee");
    assert.equal(freeContact.smsConsent, true);
    assert.ok(freeContact.activities.some((activity) => activity.activityType === "registration"));
    const updatedFreeContact = await updateCrmContact(freeContact.id, { name: "Free Public Attendee Updated", lifecycleStage: "attendee", marketingConsent: false, unsubscribed: true }, "user_test_admin");
    assert.equal(updatedFreeContact.name, "Free Public Attendee Updated");
    assert.ok(updatedFreeContact.unsubscribedAt);
    const rendered = renderEmailTemplate({ subject: "Hi {{customer_name}}", htmlBody: "<p>{{customer_name}}</p>", textBody: "Hi {{customer_name}}" }, { customer_name: "A < B" });
    assert.equal(rendered.subject, "Hi A < B");
    assert.equal(rendered.htmlBody, "<p>A &lt; B</p>");
    assert.ok((await getEmailOutbox()).some((item) => item.triggerKey === "registration.created"));
    const emailPayload = await getDb().query<{ payload_json: string }>("SELECT payload_json FROM email_outbox WHERE trigger_key = 'registration.created' ORDER BY created_at DESC LIMIT 1");
    assert.equal(JSON.parse(emailPayload.rows[0]?.payload_json ?? "{}").site_name, "Demo Operations Co.");
    assert.equal((await getSmsTemplates()).length, 3);
    assert.equal(normalizeSmsPhone("(555) 010-0142"), "+15550100142");
    assert.equal(renderSmsTemplate("Hi {{customer_name}}", { customer_name: "A < B" }), "Hi A < B");
    const smsOutbox = await getSmsOutbox();
    assert.ok(smsOutbox.some((item) => item.triggerKey === "session.starting_soon" && item.status === "queued"));
    assert.ok(smsOutbox.some((item) => item.triggerKey === "winner.drawn" && item.recipientPhone === "+15550103301"));
    const previousSmsEnabled = process.env.SMS_ENABLED;
    const previousSmsProvider = process.env.SMS_PROVIDER;
    process.env.SMS_ENABLED = "true";
    process.env.SMS_PROVIDER = "mock";
    const processedSms = await processDueSms(20);
    assert.ok(processedSms.sent >= 2);
    process.env.SMS_ENABLED = previousSmsEnabled;
    process.env.SMS_PROVIDER = previousSmsProvider;
    const registrationTemplate = (await getEmailTemplates()).find((template) => template.slug === "registration-confirmed");
    assert.ok(registrationTemplate);
    await updateEmailTemplate(registrationTemplate.id, { name: registrationTemplate.name, triggerKey: registrationTemplate.triggerKey, messageType: registrationTemplate.messageType, subject: "Updated: {{webinar_title}}", preheader: registrationTemplate.preheader, htmlBody: registrationTemplate.htmlBody, textBody: registrationTemplate.textBody, status: registrationTemplate.status }, "user_test_admin");
    const templateRevisions = await getEmailTemplateRevisions(registrationTemplate.id);
    assert.equal(templateRevisions.length, 1);
    assert.equal(templateRevisions[0]?.version, 2);
    const attendeeSequence = (await getEmailSequences()).find((sequence) => sequence.slug === "attendee-journey");
    assert.ok(attendeeSequence);
    await updateEmailSequence(attendeeSequence.id, { name: "Attendee journey updated", triggerKey: attendeeSequence.triggerKey, status: "paused" }, "user_test_admin");
    assert.equal((await getEmailSequences()).find((sequence) => sequence.id === attendeeSequence.id)?.status, "paused");

    const { createProductOrder, getOrderById, getOrders, getProductBySlug, getProducts, updateOrderFulfillment, updateProduct } = await import("@/lib/commerce");
    const products = await getProducts();
    assert.equal(products.length, 3);
    const giveawayWebinar = await createWebinar({
      ...pricingInput,
      title: "Synthetic Giveaway Session",
      description: "A synthetic session used to verify one prize and claim instructions.",
      status: "published",
      capacity: 2,
      giveawayEnabled: true,
      prizeProductId: products[0]?.id ?? null,
      claimDeadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      fulfillmentNotes: "Winner must confirm the shipping address within seven days.",
    }, "user_test_admin");
    assert.equal(giveawayWebinar.giveawayEnabled, true);
    assert.equal(giveawayWebinar.prizeProductId, products[0]?.id);
    assert.equal(giveawayWebinar.prizeProductName, products[0]?.name);
    assert.match(giveawayWebinar.fulfillmentNotes, /shipping address/);
    const giveawaySeatOne = giveawayWebinar.tiers[0]?.seats[0];
    const giveawaySeatTwo = giveawayWebinar.tiers[0]?.seats[1];
    assert.ok(giveawaySeatOne);
    assert.ok(giveawaySeatTwo);
    const giveawayHoldOne = await createSeatHold(giveawayWebinar.id, [giveawaySeatOne.id]);
    const giveawayHoldTwo = await createSeatHold(giveawayWebinar.id, [giveawaySeatTwo.id]);
    const giveawayRegistrationOne = await completeRegistration({ webinarId: giveawayWebinar.id, holdToken: giveawayHoldOne.holdToken, name: "Giveaway Attendee One", email: "giveaway.one@example.test", phone: "+1 555 010 4401", consent: false, userId: testCustomer.id });
    const giveawayRegistrationTwo = await completeRegistration({ webinarId: giveawayWebinar.id, holdToken: giveawayHoldTwo.holdToken, name: "Giveaway Attendee Two", email: "giveaway.two@example.test", phone: "+1 555 010 4402", consent: false, userId: testCustomer.id });
    const giveawayWinner = await drawWinner(giveawayWebinar.id, "user_test_admin");
    assert.equal(giveawayWinner.giveawayOutcome, "winner");
    assert.equal(giveawayWinner.giveawayPrizeName, giveawayWebinar.prizeProductName);
    const giveawayOutcomes = await getDb().query<{ id: string; giveaway_outcome: string; giveaway_prize_name: string; giveaway_claim_deadline: string }>("SELECT id, giveaway_outcome, giveaway_prize_name, giveaway_claim_deadline FROM registrations WHERE webinar_id = $1 ORDER BY id", [giveawayWebinar.id]);
    assert.equal(giveawayOutcomes.rows.length, 2);
    assert.equal(giveawayOutcomes.rows.filter((row) => row.giveaway_outcome === "winner").length, 1);
    assert.equal(giveawayOutcomes.rows.filter((row) => row.giveaway_outcome === "not_winner").length, 1);
    assert.ok(giveawayOutcomes.rows.every((row) => row.giveaway_prize_name === giveawayWebinar.prizeProductName && row.giveaway_claim_deadline));
    const giveawayEmails = await getEmailOutbox();
    assert.ok(giveawayEmails.some((item) => item.entityId === giveawayWinner.id && item.templateName === "Giveaway winner"));
    const giveawayLoserId = giveawayRegistrationOne.registrationIds[0] === giveawayWinner.id ? giveawayRegistrationTwo.registrationIds[0] : giveawayRegistrationOne.registrationIds[0];
    assert.ok(giveawayEmails.some((item) => item.entityId === giveawayLoserId && item.templateName === "Giveaway result — not selected"));

    const endedGiveaway = await createWebinar({
      ...pricingInput,
      title: "Synthetic Automatic Giveaway",
      description: "A synthetic session used to verify automatic end-of-stream drawing.",
      startsAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      status: "published",
      capacity: 1,
      giveawayEnabled: true,
      prizeProductId: products[0]?.id ?? null,
      claimDeadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      fulfillmentNotes: "Synthetic automatic draw fulfillment notes.",
    }, "user_test_admin");
    const endedSeat = endedGiveaway.tiers[0]?.seats[0];
    assert.ok(endedSeat);
    const endedHold = await createSeatHold(endedGiveaway.id, [endedSeat.id]);
    await completeRegistration({ webinarId: endedGiveaway.id, holdToken: endedHold.holdToken, name: "Automatic Draw Attendee", email: "automatic.draw@example.test", phone: "+1 555 010 4403", consent: false, userId: testCustomer.id });
    const lifecycle = await processEndedWebinars();
    assert.ok(lifecycle.completed >= 1);
    assert.ok(lifecycle.drawn >= 1);
    const automaticDraw = await getDb().query<{ drawn_by: string | null; trigger_source: string }>("SELECT drawn_by, trigger_source FROM winner_draws WHERE webinar_id = $1", [endedGiveaway.id]);
    assert.equal(automaticDraw.rows[0]?.drawn_by, null);
    assert.equal(automaticDraw.rows[0]?.trigger_source, "stream_ended");
    assert.equal((await getProducts(false, { query: "workbook", status: "active" })).length, 1);
    const workbook = await getProductBySlug("field-notebook");
    assert.ok(workbook);
    const initialInventory = workbook.inventoryQuantity;
    const productOrder = await createProductOrder({
      items: [{ productId: workbook.id, quantity: 2 }],
      customerName: "Synthetic Product Buyer",
      customerEmail: "buyer@example.test",
      customerPhone: "+1 555 010 2200",
      shippingName: "Synthetic Product Buyer",
      shippingAddressLine1: "100 Demo Way",
      shippingCity: "Arlington",
      shippingRegion: "TX",
      shippingPostalCode: "76014",
    });
    assert.equal(productOrder.items[0]?.quantity, 2);
    assert.equal(productOrder.paymentStatus, "paid");
    assert.equal(productOrder.fulfillmentStatus, "unfulfilled");
    assert.equal(productOrder.totalCents, productOrder.subtotalCents + productOrder.shippingCents);
    const inventoryAfterOrder = await getProductBySlug("field-notebook");
    assert.equal(inventoryAfterOrder?.inventoryQuantity, initialInventory - 2);
    const loadedOrder = await getOrderById(productOrder.id);
    assert.equal(loadedOrder?.orderNumber, productOrder.orderNumber);
    assert.equal(loadedOrder?.shippingCity, "Arlington");
    assert.equal((await getOrders({ query: "Synthetic Product Buyer", paymentStatus: "paid", fulfillmentStatus: "unfulfilled" })).length, 1);
    const shippedOrder = await updateOrderFulfillment(productOrder.id, "shipped", "Synthetic Carrier", "DEMO-TRACK-001", "user_test_admin");
    assert.equal(shippedOrder.fulfillmentStatus, "shipped");
    assert.equal(shippedOrder.trackingCarrier, "Synthetic Carrier");
    assert.equal(shippedOrder.trackingNumber, "DEMO-TRACK-001");
    assert.equal((await getOrders({ query: productOrder.orderNumber, fulfillmentStatus: "shipped" })).length, 1);
    const updatedProduct = await updateProduct(workbook.id, { name: "Field Notes Workbook Updated", sku: workbook.sku, description: "An updated synthetic field workbook for testing product edits.", details: "Updated demo fulfillment details for the sample physical product.", category: workbook.category, priceCents: workbook.priceCents, inventoryQuantity: initialInventory - 2, weightGrams: workbook.weightGrams, status: workbook.status }, "user_test_admin");
    assert.equal(updatedProduct.slug, workbook.slug);
    assert.equal(updatedProduct.name, "Field Notes Workbook Updated");
    const orderContact = await getCrmContact("crm-contact-6275796572406578616d706c652e74657374");
    assert.ok(orderContact);
    assert.equal(orderContact.lifecycleStage, "customer");
    assert.ok(orderContact.activities.some((activity) => activity.activityType === "order"));
    assert.ok((await getEmailOutbox()).some((item) => item.triggerKey === "order.created"));
    assert.ok((await getEmailOutbox()).some((item) => item.triggerKey === "order.shipped"));

    await getDb().query("UPDATE system_metadata SET value = 'imported' WHERE key = 'dataset_origin'");
    await assert.rejects(
      getPublicWebinars(),
      (error: unknown) => error instanceof Error && /refuses to serve imported legacy data/.test(error.message),
    );
  } finally {
    await postgres.close();
  }
});
