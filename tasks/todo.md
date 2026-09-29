# Todo: KosManage v2.0

## Slice 0 — SSOT+plan
- [x] T0.1 SSOT append D1–D9 (PRD/REQ/ARCH/DB/API/UIUX/SEC/TEST/ASSUMP/DEV/README/STATUS)
  - Acceptance: semua delta konsisten, tanpa ubah src/migration
  - Verify: git diff --stat hanya docs+tasks; grep v2.0 di tiap SSOT
  - Files: *.md, tasks/*
- [x] T0.2 plan + todo + changelog scaffold
  - Acceptance: tasks/plan.md, tasks/todo.md, CHANGELOG.md ada
  - Verify: file exists; plan punya slices T0–T13
  - Files: tasks/plan.md, tasks/todo.md, CHANGELOG.md
- [x] T0.3 Approval gate
  - Acceptance: user setuju mulai Slice 1
  - Verify: reply eksplisit
  - Dependencies: T0.1, T0.2

## Slice 1 — identity-role
- [x] T1.1 Migration profiles.role/email/phone + sync (applied live, verified)
  - Acceptance: additive; default owner; email display copy terdokumentasi
  - Verify: migration apply clean; rollback drop-only
  - Files: supabase/migrations/*, DATABASE.md, tests
  - Risk: drift email
- [x] T1.2 tenants.profile_id + partial unique + index (applied live, verified)
  - Acceptance: 1 active per profile; legacy null OK
  - Verify: double-active ditolak; integration test
  - Files: supabase/migrations/*, tests
- [x] T1.3 RLS foundation private helper + policies (corrective 20260328 applied live, verified)
  - Acceptance: USING+WITH CHECK; owner/tenant isolation
  - Verify: RLS checklist TESTING.md v2.0
  - Files: supabase/migrations/*, SECURITY.md
- [x] T1.4 Role guard + tests (21/21 incl. 8 role tests; hardening 20260329)
  - Acceptance: tenant deny owner URL; owner pass
  - Verify: unit/route tests
  - Files: src/routes/*, src/features/auth/*, tests

## Checkpoint: Slice 1
- [x] typecheck, tests, migration clean, RLS hold (all PASS)

## Slice 2 — nav/protection
- [x] T2.1 Owner/Tenant shells + guards
  - Acceptance: nav D8; hiding bukan auth
  - Verify: route tests both roles
  - Files: src/layouts/*, src/App.tsx

## Slice 3 — facilities
- [x] T3.1 facilities + room_facilities + backfill (applied live, verified: 5 facilities + 5 links)
  - Acceptance: unique per property; non-destruktif
  - Verify: backfill test; duplicate rejected
  - Files: supabase/migrations/*, tests
- [x] T3.2 checkbox + inline add auto-selected (checkbox UI + inline add auto-selected, inactive preserved)
  - Acceptance: FR-092 harfiah
  - Verify: component tests
  - Files: src/pages/RoomsPage.tsx, src/services/facilities.ts, src/schemas/*

## Slice 4 — rental
- [x] T4.1 daysRemaining Asia/Jakarta + buckets (rental.ts + 19 tests, computed only)
  - Acceptance: FR-100; >30/30/15/7/1/0/negatif
  - Verify: deterministik unit tests
  - Files: src/lib/rental.ts, tests

## Slice 5 — maintenance
- [x] T5.1 reports lifecycle (table + RLS + transition guard, migration pending manual apply)
  - Acceptance: FR-110/111/112
  - Verify: Zod + DB transition tests; isolation tests
  - Files: supabase/migrations/*, src/services/maintenance.ts, src/schemas/*

## Slice 6 — storage
- [x] T6.1 private bucket + RLS + 2-step + signed URL (code+tests PASS; migration pending manual apply)
  - Acceptance: D6/D9 harfiah
  - Verify: MIME/size/ownership tests
  - Files: supabase/migrations/*, src/services/*, SECURITY.md

## Slice 7 — payments
- [x] T7.1 additive + qris + simulasi
  - Acceptance: FR-120/121; trigger intact; SIMULASI label
  - Verify: status/ownership/isolation tests
  - Files: supabase/migrations/*, src/pages/*, tests

## Slice 8/9 — dashboards
- [ ] T8.1 owner KPI expansion (data nyata)
- [ ] T9.1 tenant dashboard + empty states

## Slice 10 — profile
- [ ] T10.1 tenant self-edit guarded (block role/ids)

## Slice 11 — reports
- [ ] T11.1 split Laporan/Laporan Keuangan/Laporan Saya/Riwayat

## Slice 12/13 — final
- [ ] T12.1 security + code review + simplification
- [ ] T13.1 full verify + bump v2.0 + changelog + status
  - Acceptance: typecheck/tests/build/lint; runtime matrix; versions sync; no secrets; no push
