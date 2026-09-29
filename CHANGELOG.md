# Changelog

## [Unreleased] — v2.0
### Slice 3 COMPLETE — master facilities + room assignments (live verified)
- facilities master per property (unique property_id + lower(btrim(name))); room_facilities M2M (CASCADE room, RESTRICT facility).
- Corrective migration for legacy '+' delimiter: 5 facilities + 5 links live; legacy rooms.facilities untouched; artifacts removed via captured IDs.
- Cross-property guard on INSERT/UPDATE WITH CHECK; tenant read-own; owner-only mutation.
- RoomsPage checkbox UI + inline add (auto-selected); inactive-linked preserved.
- Live verified: counts, no dup normalized, no combined artifact, RLS PASS. Tests 43/43, typecheck, build PASS.

### Slice 2 COMPLETE — navigation + role route protection
- RoleGuard fail-closed (profile.role only); owner 7 routes, tenant 6 routes; 27/27 tests PASS, typecheck PASS, build PASS.
 (in progress, NOT released)

### Slice 1 — identity-role foundation (COMPLETE, live verified)
- profiles.role (owner|tenant, default owner), profiles.email/phone display copy.
- tenants.profile_id → profiles.id; partial unique: one ACTIVE tenant per profile.
- RLS: 12 owner policies moved to private.is_property_owner; tenant self-read via private.is_own_tenant; public.is_property_owner revoked + dropped.
- Trigger hardening: handle_new_user DEFINER locked down (no direct EXECUTE); guard_profile_role_change + prevent_tenant_profile_relink INVOKER, trigger-only.
- Live verified on aamizrsuxbaaiiafrile: schema, RLS, provisioning, isolation, existing data intact.
- Tests 21/21, typecheck, vite build PASS.

### Slice 0 — SSOT + plan (COMPLETE)
- SSOT v2.0 delta appended (D1–D9 binding); tasks/plan.md + tasks/todo.md created.

## [v1.0] — MVP baseline
- Auth, dashboard, rooms, tenants, payments, reports, settings; RLS ownership; triggers occupancy + payment status; seed demo.
- Metadata legacy 0.1.0 di package/Tauri/Cargo — sync ke 2.0 di final release (tanpa rilis perantara).
