# TESTING — KosManage

## Goals

Protect core business rules and the primary user flows without requiring an enterprise test matrix.

## Strategy overview

| Layer | Tooling (planned) | Focus |
|-------|-------------------|--------|
| Unit | Vitest | Payment status helpers, Zod schemas, pure utils |
| Component | Vitest + React Testing Library | Forms, empty/loading states, critical UI |
| Integration | Vitest + Supabase local / SQL | Occupancy rules, RLS ownership, payment triggers |
| E2E / desktop | Playwright or Tauri-appropriate approach | Happy-path flows A–D |
| Rust | `cargo test` | Native commands/utils when non-trivial |

Until the app is bootstrapped, prioritize **SQL-level verification** of migrations (constraints, triggers, RLS) against a local Supabase instance.

## Unit tests

Must cover:

| Area | Examples | Related |
|------|----------|---------|
| Payment status logic | Mirror `compute_payment_status` cases: unpaid, partial, paid, overdue | FR-044 |
| Validation | Room/tenant/payment Zod schemas reject negatives, missing required fields | SEC-004 |
| Formatting utils | Currency IDR, billing period `YYYY-MM` | — |
| Occupancy helpers | Available-only room picker filtering | FR-025, FR-026 |

## Integration tests

| Scenario | Expectation |
|----------|-------------|
| Assign second active tenant to same room | Fails (unique partial index / trigger) |
| Assign tenant to maintenance room | Fails |
| Activate tenant on available room | Room → `occupied` |
| Deactivate last active tenant | Room → `available` (if not maintenance) |
| Insert payment with wrong client status | DB overwrites correct status |
| Negative `amount_paid` | Rejected by CHECK |
| Duplicate `(tenant_id, billing_period)` | Rejected |
| Owner B reads Owner A rooms | RLS returns empty / error |
| Delete occupied room | Trigger exception |

## E2E critical path

```text
Login
  → Dashboard loads summary
  → Add Room
  → Add Tenant (available room)
  → Record Payment
  → Dashboard / Reports reflect changes
  → Logout
```

Map to flows A–D in `PRD.md`.

Additional E2E cases (Should):

- Login failure message
- Cannot select maintenance room in tenant form
- Filter payments by status

## Database / RLS checklist

Run after migration + seed:

1. Login as seed owner → see 25 rooms, 21 active tenants.
2. Confirm payment statuses match formula for seeded rows.
3. Create second auth user → cannot SELECT first owner’s properties/rooms.
4. Attempt double-book via SQL as owner → error.

## Definition of done for a feature PR

- New business rule has unit and/or integration coverage
- Typecheck passes
- Relevant tests pass
- No weakening of RLS to “make tests pass”

## Out of scope for early MVP testing

- Visual regression suite
- Full a11y audit automation (manual checks still required)
- Load testing beyond 50 rooms

---

# v2.0 Test Matrix (TDD, per slice)

- ROLE: owner nav vs tenant nav; unauthorized role route rejected; cross-role URL deny.
- FACILITIES: create; duplicate per property rejected; inline add auto-selected; inactive hidden default; existing assoc preserved; M2M relation.
- RENTAL: days_remaining buckets >30/30/15/7/1/0/negatif; Asia/Jakarta deterministik; null end_date handling (final: open-ended label).
- MAINTENANCE: valid create; invalid Zod rejected; tenant own-only; owner property-only; invalid transition rejected; resolved_at behavior; photo MIME/size/ownership validation.
- PAYMENTS: qris accepted; reference/url/paid_at additive; status trigger tetap; ownership + tenant isolation + owner property isolation; simulasi label.
- SECURITY/RLS: owner A vs B; tenant A vs B; tenant block owner fields; tenant block report ownership change; storage tenant-own vs owner-property.
- Util tests: daysRemaining, rentalBucket, facility normalize, payment simulation label. Integration: backfill legacy non-destruktif. E2E: owner login, tenant login, facilities checkbox, countdown, report+photo, status flow, payment sim, dashboards, profile, logout.

## Rental countdown (Slice 4)
- 19 tests: boundaries 0/1/6/7/14/15/30/31, past-due, null open-ended, Jakarta midnight, leap, invalid; deterministic via injected now.

## Maintenance (Slice 5)
- Grants check (role_table_grants): authenticated SELECT/INSERT/UPDATE yes, DELETE/TRUNCATE/REFERENCES/TRIGGER absent.
- 26 tests: 4 lifecycle matrix + 13 Zod (incl. forbidden-field strip) + 1 service contract (no storage fns) + 8 existing-adjacent. Live checklist in migration section 5 (table/constraints/indexes/policies/functions/grants/counts).

## Maintenance photos (Slice 6)
- 10 tests: MIME/size/ext/filename/path-format/two-step order/narrow-attach/signed-URL-null. Live checklist in migration section 4.
