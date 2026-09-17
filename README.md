# Webinar Studio

Standalone webinar operations application built from scratch. This project does not use WordPress, WooCommerce, the archived database, or any original customer/product records.

## Quick start

```bash
pnpm install
Copy-Item .env.example .env.local
# Edit .env.local and set DATABASE_URL to a development PostgreSQL/Neon connection.
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open <http://localhost:3000>.

Seeded samples never create login accounts or default passwords. To access the local admin, set `INITIAL_ADMIN_EMAIL` and a strong `INITIAL_ADMIN_PASSWORD` in `.env.local`, then run `pnpm db:create-admin`. For role testing, set unique `DEMO_ADMIN_PASSWORD`, `DEMO_MANAGER_PASSWORD`, and `DEMO_CUSTOMER_PASSWORD` values of at least 20 characters plus `DEMO_USER_SEED_CONFIRMATION=local-only-demo-users` in the local environment, then run `pnpm db:seed-users`. That command creates or resets only the three reserved `.test` identities, requires explicit non-production `DEMO_MODE=true`, verifies the database is marked as the standalone dataset, records synthetic audit events, and never prints or stores passwords in plaintext.

The `.env.local` file must contain `DATABASE_URL` as a PostgreSQL connection string before running the migration or seed commands. Neon is used by the deployed Vercel app; a separate Neon branch or local PostgreSQL database is recommended for development. Migrations are explicit and safe to rerun. `pnpm db:seed` creates only synthetic webinar, ticket, seat, registration, and product samples; it refuses to seed over unmarked application data. No payment gateway, carrier, email provider, SMS provider, or webinar provider is contacted by the demo. `INTEGRATION_ENCRYPTION_KEY` should be a unique random secret of at least 32 characters in any environment where provider credentials will be saved; the application falls back to `SESSION_SECRET` only for development compatibility.

`DEMO_MODE` applies only to local development. Production sample records are inserted by the explicit seed command, never on a request or cold start. Sample data never creates login accounts. Production checkout remains disabled until a real payment provider is configured. Set a unique, random `SESSION_SECRET` (at least 32 characters) and `APP_URL` in Vercel. Create the first production admin with `pnpm db:create-admin` using `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` of at least 20 characters; the command refuses to overwrite an existing admin.

## Current foundation

- Next.js App Router with TypeScript and React.
- Managed PostgreSQL through Neon, with versioned SQL migrations and parameterized queries.
- Atomic, server-side seat holds with a five-minute expiry; customer accounts are required before a seat is removed from inventory.
- Explicit seat states: available, held, sold.
- Registration records tied to webinar, tier, seat, and registration group.
- Role-based session authentication with HTTP-only cookies: administrators have full control, managers operate content, commerce, automated email, and visual appearance, and customers stay on public-facing account flows.
- Administrator-only Team & Access management for creating manager accounts, promoting existing customers, and auditing role changes; the last administrator cannot be demoted.
- Admin dashboard, webinar management, seat map, registration table, winner draw, planning calculator, and playbook templates.
- WordPress-familiar admin shell with grouped navigation, Add New shortcuts, edit screens, explicit draft/published states, inline product editing, and email template revision history.
- Editable site and company profile with display/legal name, tagline, logo URL, contact details, address, operating details, policy links, and social links reused by public chrome, metadata, JSON-LD, and correspondence payloads.
- Optional site-wide 18+ visitor gate managed from the company profile; it stores a 30-day browser acknowledgement and excludes login, admin, API, and framework routes.
- WordPress-familiar visual page management with reusable hero, text, image, call-to-action, and spacer blocks; drag-and-drop ordering; live preview; revision history; draft/published/archived states; and guarded permanent deletion.
- Native Navigation management with reusable header, footer, and mobile menus; sortable and nested links; page, product, category, session, and safe custom-link candidates; automatic published-page additions; and a page-builder Navigation menu block with horizontal or stacked presentation.
- Rich-text and HTML page blocks with image insertion, underline, color, size, alignment, and approved media embeds; stored markup is sanitized so scripts, forms, event handlers, and unsafe URLs are removed.
- Public webinar catalog, session detail pages, account-gated registration, five-second seat availability refresh, and attendee account portal.
- Standalone physical-product catalog with SKUs, inventory, shipping checkout, order records, and admin fulfillment/tracking states.
- Three synthetic virtual-first service-location pages with local landing-page content and internal links.
- Native JSON-LD entity graphs for the organization, website, webinars, services, locations, and breadcrumbs.
- Queued delivery ledger for email/SMS work with idempotency keys.
- Admin provider chooser for Cloudflare Stream, Mux, or Amazon IVS, plus Resend, Postmark, or SendGrid; provider credentials are encrypted server-side and never returned to the browser.
- Session giveaway setup with one catalog-linked prize, immutable product snapshot, claim deadline, fulfillment notes, manual host draw, scheduled end-of-session draw, winner/non-winner outcome fields, and queued result emails.
- Email correspondence center with reusable templates, timed sequences, suppression records, and a provider-neutral outbox.
- SMS notification center with independent consent, registration reminders, winner alerts, a mock provider, a Twilio adapter boundary, delivery callbacks, and a scheduled outbox worker.
- CRM with unified email-keyed contacts, lifecycle stages, consent state, tags, internal notes, and activity timelines.
- Health endpoint at `/api/health`.
- Robots and sitemap routes for the public experience.
- Local Next.js DevTools MCP configuration and an `agentic-readiness` smoke scan that checks the public contract, data boundary, metadata, security headers, and auth redirects.

## Architecture decisions from the developer plan

The project keeps the useful product ideas from `v3-refactor-plan-technical.pdf` but translates them into a standalone application:

- Webinar instances are first-class records, not products.
- Seat inventory is relational and server-authoritative, not post metadata.
- Templates and cost planning are application features, not WordPress settings.
- Scheduling and backup-session concepts belong in the webinar lifecycle model.
- Delivery should run through durable background jobs, not blocking request loops.
- Provider integrations should be adapters for payment, event hosting, SMS, and email.
- No migration code or archived data is part of the runtime.

## Production work still required

The deployed release is a synthetic-data demo and intentionally does not process real payments. Before using it for live registrations, add:

1. A real payment adapter with webhook verification and PCI-safe token handling for both webinar seats and physical products.
2. A carrier/shipping adapter, package labels, tax calculation, returns, and queue workers for fulfillment and provider synchronization.
3. Activate the selected live-stream and email provider adapters with retries, redacted logs, webhook verification, and idempotency. The admin chooser and encrypted credential store are ready; provider calls remain disabled until the adapters, sender/domain verification, stream lifecycle callbacks, and replay access controls are completed. The SMS outbox, mock provider, Twilio adapter boundary, and worker are implemented; add the provider credentials, sender registration, consent review, and callback verification before enabling real SMS. The protected webinar lifecycle worker marks scheduled sessions complete and triggers an automatic drawing; connect the selected stream provider's verified end-of-stream event to the same domain boundary for early or provider-confirmed endings.
4. Password-reset and account-recovery flows.
5. Shared edge/Redis rate limiting and expanded CSRF/risk controls for browser mutations. The initial administrator/manager/customer permission matrix is implemented; expand it only when additional staff roles are introduced.
6. Persistent template, scheduling, and backup-webinar administration.
7. Expanded integration, concurrency, accessibility, and Playwright end-to-end tests.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm readiness:agentic
pnpm lighthouse http://localhost:3000/webinars --output=html --output-path=./lighthouse.html
```

`pnpm readiness:agentic` expects the local app at `http://localhost:3000`. Set `READINESS_REQUIRE_GIT=true` in the release gate so it also requires a clean `main` branch with a commit. The scan is intentionally read-only and does not send customer, product, or registration data to an AI service.

The protected webinar lifecycle worker accepts `CRON_SECRET` (or the optional `WEBINAR_WORKER_SECRET`) and runs alongside the SMS worker. It completes sessions whose scheduled duration has elapsed and performs an automatic giveaway draw when an eligible registration exists. The worker endpoints are intentionally not declared as frequent Vercel Cron jobs in this release because the connected Hobby plan permits only daily schedules. For live operation, call the protected endpoints from an external scheduler, a provider end-of-stream webhook, or a Vercel Pro project with the desired schedule.

### SMS setup

SMS is disabled unless `SMS_ENABLED=true`. Local development uses `SMS_PROVIDER=mock`, which marks due messages as sent without contacting a carrier. For production, set `SMS_PROVIDER=twilio`, add the Twilio account, auth token, and Messaging Service SID as server-side Vercel environment variables, and set `SMS_WORKER_SECRET` or `CRON_SECRET`. The `/api/internal/sms/process` route accepts only the configured worker secret; schedule it with the same worker mechanism used for webinar lifecycle processing. Complete sender registration and confirm the SMS consent language before enabling real delivery.

The Lighthouse CLI is pinned in `package.json` for repeatable local release checks. For a complete report, use both `--output=html` and `--output=json`; reports should be written to a local artifact directory and kept out of Git.

Vercel deployments run the idempotent database migration runner before the Next.js build so a newly connected production database receives the standalone schema before pages are prerendered. The runner uses a transaction and an exclusive migration lock; it never imports the archived WordPress database.

## Web MCP

The repository includes `.mcp.json` for the Next.js DevTools MCP server. Start the app with `pnpm dev`, then let an MCP-capable development client discover the local Next.js server. See [`docs/web-mcp.md`](docs/web-mcp.md) for the boundary between local runtime inspection, authoritative web research, and future audited provider integrations.

The old archive is intentionally out of scope. Do not connect it to this application or import its SQL dump. The finished app contains only synthetic demo records created by `scripts/seed.ts`.
