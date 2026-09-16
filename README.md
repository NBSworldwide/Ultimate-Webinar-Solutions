# Webinar Studio

Standalone webinar operations application built from scratch. This project does not use WordPress, WooCommerce, the archived database, or any original customer/product records.

## Quick start

```bash
pnpm install
pnpm db:seed
pnpm dev
```

Open <http://localhost:3000>.

Demo accounts (local development only):

- Admin: `admin@demo.webinar.local` / `demo-admin`
- Attendee: `attendee@demo.webinar.local` / `demo-attendee`

The local database is created at `.data/webinar.sqlite` and is seeded automatically with synthetic records when it is empty. No payment gateway, email provider, SMS provider, or webinar provider is contacted by the demo.

The seed is explicitly controlled by `DEMO_MODE` and `ALLOW_DEMO_SEED`. Keep both enabled only for local development. A production process refuses to start with demo seeding enabled, rejects an unmarked database, and disables the demo checkout path. Copy `.env.example` to `.env.local` and use a randomly generated `SESSION_SECRET` before deploying.

## Current foundation

- Next.js App Router with TypeScript and React.
- SQLite for a zero-configuration local development database. The schema is designed so production can move to PostgreSQL without returning to WordPress metadata.
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

The local release intentionally uses a demo checkout rather than real payment processing. Before production, add:

1. PostgreSQL migrations and a managed database.
2. A real payment adapter with webhook verification and PCI-safe token handling.
3. Queue workers for the delivery ledger and provider synchronization.
4. LiveStorm/Zoom, Twilio, and email adapters with retries, redacted logs, and idempotency.
5. Password-reset and account-recovery flows.
6. Shared edge/Redis rate limiting, expanded CSRF/risk controls for browser mutations, and a full permission matrix.
7. Persistent template, scheduling, and backup-webinar administration.
8. Unit, integration, concurrency, accessibility, and Playwright end-to-end tests.

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

The old archive is intentionally out of scope. Do not point `DATABASE_PATH` at it or copy the SQL dump into `.data`. The finished app contains only synthetic demo records created by `scripts/seed.ts`.
