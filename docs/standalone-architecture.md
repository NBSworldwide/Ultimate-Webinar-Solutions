# Standalone architecture notes

## Fresh-start boundary

The standalone application starts with synthetic records only. The cPanel backup and its extracted analysis directory are not application inputs. There is no WordPress compatibility layer and no product/customer importer in this repository.

## Domain modules

- **Webinars**: lifecycle, schedule, host, provider, replay, visibility.
- **Tiers**: price and capacity groups within a webinar.
- **Inventory**: atomic seat holds, expirations, sales, reconciliation, and a live availability endpoint for open seat maps.
- **Registrations**: one record per seat with customer-account identity and consent snapshots.
- **Delivery**: email/SMS queue records, idempotency, retries, provider IDs.
- **Winners**: eligible candidate snapshot, server-side cryptographic draw, audit event.
- **Giveaways**: one catalog-linked prize per session, immutable prize snapshot, claim deadline, fulfillment notes, manual host draw, scheduled end-of-session draw, persisted winner/non-winner outcomes, and queued result notifications.
- **Provider configuration**: encrypted server-side credentials selected from supported streaming and transactional-email adapters; browser responses expose provider choice and configuration status, never secrets.
- **Playbooks**: reusable session patterns and profitability planning.
- **Locations**: service-region pages with a linked entity graph for public discovery.
- **Content pages**: editable public pages composed from validated reusable blocks with revision history and explicit lifecycle states.
- **Commerce**: physical products, SKU inventory, atomic demo checkout, shipping addresses, order items, and fulfillment/tracking states.
- **Correspondence**: reusable email templates, timed sequences, suppression records, and a durable provider-neutral outbox.
- **CRM**: normalized contacts, consent, lifecycle stages, tags, notes, and cross-domain activity timelines.
- **Admin experience**: a standalone WordPress-familiar information architecture with list/detail/edit workflows, Add New entry points, explicit lifecycle states, inline catalog editing, and visible email revisions. Familiarity is provided by interaction patterns, not WordPress dependencies.
- **Site identity**: a singleton `site_settings` record edited from `/admin/settings`; public surfaces read the same profile for branding, contact information, organization schema, metadata, and correspondence variables.
- **Visitor access**: the same site settings record can enable an optional 18+ acknowledgement gate for public pages. The browser acknowledgement lasts 30 days; it is not identity or legal age verification.

## Translation of the prior developer plan

| Plan recommendation | Standalone translation |
| --- | --- |
| Webinar custom post type | `webinars` table and `/admin/webinars` screens |
| Product link | Webinars and physical products are separate domains; a product is not required for a webinar |
| Seat post metadata | `tiers` and `seats` tables with a uniqueness constraint |
| Temporary booking table | Seat hold state with token hash and expiry |
| WooCommerce email classes | Delivery templates and a background delivery worker |
| WordPress cron | Durable queue and scheduler |
| Backup webinar queue | Webinar lifecycle and backup-runner records |
| Cost calculator | Typed planning tool in the Playbooks view |
| Webinar templates | Reusable playbook definitions |
| HPOS compatibility | `products`, `orders`, and `order_items` are direct relational storage; payment and carrier adapters remain explicit |
| Migration interface | Deliberately omitted because this is a fresh start |

## State invariants

1. A seat belongs to exactly one tier.
2. A tier belongs to exactly one webinar.
3. A seat can have at most one active registration.
4. Only an authenticated customer account can create a hold or finalize a registration.
5. Only an unexpired hold token can finalize a held seat.
6. Winner selection can run once per webinar unless an explicit audited redraw feature is added.
7. External work is queued after domain state commits.
8. Synthetic seed data is identifiable and contains no archive-derived identity.
9. Product checkout locks selected rows before decrementing inventory, so a physical item cannot be oversold by concurrent demo orders.
10. Order items snapshot product name, SKU, and price so later catalog edits do not rewrite historical orders.
11. Contacts are keyed by normalized email so registrations and product orders share one CRM record without importing legacy customer data.
12. Email content is stored separately from delivery; provider adapters consume outbox jobs and never receive credentials from browser code.
13. SMS consent is separate from email consent; reminder and winner messages are queued only for an active, consented phone number.
14. SMS provider calls happen through the protected scheduled outbox worker; the drawing transaction never waits on a carrier API.
15. Company identity is stored separately from customer and product records, so changing the site profile does not rewrite historical order or registration snapshots.
16. A session prize snapshots its catalog name, SKU, and value at setup time, so later product edits do not rewrite the historical giveaway.
17. A completed giveaway records one winner and one non-winner outcome for every eligible registration, with the prize and fulfillment context copied to the registration result fields.

## Public structured-data boundary

Public pages should expose only facts visible on the corresponding page. Use JSON-LD entity graphs for the organization, website, public service/location pages, breadcrumbs, published events, and active products. Do not emit attendee data, private replay URLs, admin URLs, or made-up ratings/reviews.
