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
