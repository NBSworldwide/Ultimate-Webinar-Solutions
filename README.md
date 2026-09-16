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

Seeded samples never create login accounts or default passwords. To access the local admin, set `INITIAL_ADMIN_EMAIL` and a strong `INITIAL_ADMIN_PASSWORD` in `.env.local`, then run `pnpm db:create-admin`.

The `.env.local` file must contain `DATABASE_URL` as a PostgreSQL connection string before running the migration or seed commands. Neon is used by the deployed Vercel app; a separate Neon branch or local PostgreSQL database is recommended for development. Migrations are explicit and safe to rerun. `pnpm db:seed` creates only synthetic webinar, ticket, seat, and registration samples; it refuses to seed over unmarked application data. No payment gateway, email provider, SMS provider, or webinar provider is contacted by the demo.

`DEMO_MODE` applies only to local development. Production sample records are inserted by the explicit seed command, never on a request or cold start. Sample data never creates login accounts. Production checkout remains disabled until a real payment provider is configured. Set a unique, random `SESSION_SECRET` (at least 32 characters) and `APP_URL` in Vercel. Create the first production admin with `pnpm db:create-admin` using `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` of at least 20 characters; the command refuses to overwrite an existing admin.

## Current foundation

- Next.js App Router with TypeScript and React.
- Managed PostgreSQL through Neon, with versioned SQL migrations and parameterized queries.
- Atomic, server-side seat holds with a ten-minute expiry.
- Explicit seat states: available, held, sold.
- Registration records tied to webinar, tier, seat, and registration group.
- Admin session authentication with HTTP-only cookies.
- Admin dashboard, webinar management, seat map, registration table, winner draw, planning calculator, and playbook templates.
- Public webinar catalog, session detail pages, registration form, and attendee account portal.
- Three synthetic virtual-first service-location pages with local landing-page content and internal links.
- Native JSON-LD entity graphs for the organization, website, webinars, services, locations, and breadcrumbs.
- Queued delivery ledger for email/SMS work with idempotency keys.
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

1. A real payment adapter with webhook verification and PCI-safe token handling.
2. Queue workers for the delivery ledger and provider synchronization.
3. LiveStorm/Zoom, Twilio, and email adapters with retries, redacted logs, and idempotency.
4. Password-reset and account-recovery flows.
5. Shared edge/Redis rate limiting, expanded CSRF/risk controls for browser mutations, and a full permission matrix.
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

The Lighthouse CLI is pinned in `package.json` for repeatable local release checks. For a complete report, use both `--output=html` and `--output=json`; reports should be written to a local artifact directory and kept out of Git.

## Web MCP

The repository includes `.mcp.json` for the Next.js DevTools MCP server. Start the app with `pnpm dev`, then let an MCP-capable development client discover the local Next.js server. See [`docs/web-mcp.md`](docs/web-mcp.md) for the boundary between local runtime inspection, authoritative web research, and future audited provider integrations.

The old archive is intentionally out of scope. Do not connect it to this application or import its SQL dump. The finished app contains only synthetic demo records created by `scripts/seed.ts`.
