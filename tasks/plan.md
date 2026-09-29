# Implementation Plan: KosManage v2.0 Owner & Tenant Expansion

## Overview
Upgrade v1.0 → v2.0: role owner/tenant, facilities M2M + checkbox, rental countdown Asia/Jakarta, maintenance reports + private photo storage, payment additive (qris/reference/url/paid_at, simulasi berlabel), tenant dashboards/profile, Laporan vs Laporan Keuangan split. Tanpa Liquid Glass redesign. Stack locked. Baseline produk v1.0; metadata 0.1.0 legacy sync di final.

## Architecture Decisions
- D1 profiles.email display copy; auth=auth.users.email; sync aman; bukan auth source.
- D2 tenants.profile_id→profiles.id; 1 active per profile (partial unique); legacy null.
- D3 payments: keep status/payment_method/payment_date; additive qris/reference/url/paid_at; trigger status dipertahankan; gateway out of scope.
- D4 rooms.facilities legacy preserved read-only; backfill non-destruktif ke master.
- D5 helper → private.is_property_owner hardened (DEFINER minimal, search_path='', revoke PUBLIC); review semua policy.
- D6 bucket private maintenance-reports; path {property}/{tenant}/{report}/{file}; signed URL.
- D7 days_remaining computed Asia/Jakarta; bucket >30/15–30/7–14/1–6/0/<0; tests deterministik.
- D8 nav split owner Laporan vs Laporan Keuangan; tenant Laporan Saya vs Riwayat.
- D9 photo 2-step: create → upload → update image_url; validasi MIME/size/ownership.

## Task List (index; detail di tasks/todo.md)

### Slice 0 — SSOT+plan (this stage)
- [x] T0.1 SSOT append konsisten D1–D9
- [x] T0.2 tasks/plan.md + tasks/todo.md + CHANGELOG.md
- [ ] T0.3 Human approval → Slice 1

### Slice 1 — identity-role
- T1.1 profiles.role/email/phone migration + trigger sync
- T1.2 tenants.profile_id + partial unique + index
- T1.3 RLS fdn (private helper + owner/tenant policies)
- T1.4 role guard routes + tests

### Slice 2 — nav + route protection
- T2.1 OwnerShell + TenantShell + guards; tests role routes

### Slice 3 — facilities
- T3.1 facilities + room_facilities migration + backfill legacy
- T3.2 checkbox UI + inline add auto-selected; tests

### Slice 4 — rental period
- T4.1 daysRemaining util Asia/Jakarta + buckets + tests edge

### Slice 5 — maintenance lifecycle
- T5.1 maintenance_reports table + RLS + transition guard + tests

### Slice 6 — photo storage
- T6.1 bucket private + storage RLS + 2-step flow + signed URL + tests MIME/size

### Slice 7 — payment expansion
- T7.1 additive cols + qris + simulasi berlabel + tests

### Slice 8/9 — dashboards
- T8.1 owner KPI expansion; T9.1 tenant dashboard + empty states

### Slice 10 — tenant profile
- T10.1 guarded self-edit

### Slice 11 — reports split
- T11.1 Laporan vs Laporan Keuangan vs Laporan Saya vs Riwayat

### Slice 12/13 — review + final verify
- T12.1 security + code review + simplification; T13.1 typecheck/tests/build/lint + runtime matrix + version bump v2.0 + changelog

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Backfill legacy merusak data | High | parse non-destruktif; preserve kolom; test backfill |
| RLS recursion helper | High | DEFINER minimal + search_path=''; review policy |
| Timezone countdown flaky | Med | util pure + inject now; tests deterministik |
| Storage leak public | High | private + RLS + signed URL; review |
| Scope creep gateway nyata | High | simulasi berlabel; gateway Won't v2.0 |
| .bin Windows/Rollup host | Low | node langsung; optional dep Linux terpasang |

## Open Questions
- Trigger sync profiles.email detail final di migration (Slice 1).
- FK room_facilities→facilities RESTRICT vs CASCADE final (Slice 3).
- Null end_date label open-ended final (Slice 4).
- paid_at vs payment_date dual-write rule final (Slice 7).
