# Standalone architecture notes

## Fresh-start boundary

The standalone application starts with synthetic records only. The cPanel backup and its extracted analysis directory are not application inputs. There is no WordPress compatibility layer and no product/customer importer in this repository.

## Domain modules

- **Webinars**: lifecycle, schedule, host, provider, replay, visibility.
- **Tiers**: price and capacity groups within a webinar.
- **Inventory**: atomic seat holds, expirations, sales, and reconciliation.
- **Registrations**: one record per seat with customer and consent snapshots.
- **Delivery**: email/SMS queue records, idempotency, retries, provider IDs.
- **Winners**: eligible candidate snapshot, server-side cryptographic draw, audit event.
- **Playbooks**: reusable session patterns and profitability planning.
- **Locations**: service-region pages with a linked entity graph for public discovery.

## Translation of the prior developer plan

| Plan recommendation | Standalone translation |
| --- | --- |
| Webinar custom post type | `webinars` table and `/admin/webinars` screens |
| Product link | Optional payment/catalog reference; no product is required for a webinar |
| Seat post metadata | `tiers` and `seats` tables with a uniqueness constraint |
| Temporary booking table | Seat hold state with token hash and expiry |
| WooCommerce email classes | Delivery templates and a background delivery worker |
| WordPress cron | Durable queue and scheduler |
| Backup webinar queue | Webinar lifecycle and backup-runner records |
| Cost calculator | Typed planning tool in the Playbooks view |
| Webinar templates | Reusable playbook definitions |
| HPOS compatibility | Direct order/payment adapters are explicit; no WordPress order storage |
| Migration interface | Deliberately omitted because this is a fresh start |

## State invariants

1. A seat belongs to exactly one tier.
2. A tier belongs to exactly one webinar.
3. A seat can have at most one active registration.
4. Only an unexpired hold token can finalize a held seat.
5. Winner selection can run once per webinar unless an explicit audited redraw feature is added.
6. External work is queued after domain state commits.
7. Synthetic seed data is identifiable and contains no archive-derived identity.

## Public structured-data boundary

Public pages should expose only facts visible on the corresponding page. Use JSON-LD entity graphs for the organization, website, public service/location pages, breadcrumbs, and individual published events. Do not emit attendee data, private replay URLs, admin URLs, or made-up ratings/reviews.
