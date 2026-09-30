# Changelog

## [Unreleased] — v2.0
### Slice 12 — security + code review + simplification
- Slice 10–11 reviewed across correctness, readability, architecture, security, and performance; no Critical/Required findings.
- Current local verification: Vitest 139/139 PASS; typecheck PASS; production build PASS (Vite 1784 modules; chunk-size warning only).
- No schema or migration changes in this review.
### Slice 11 — reports split (no migration)
- Owner Laporan sekarang fokus operasional/maintenance; owner Laporan Keuangan fokus tagihan, pembayaran diterima, dan tunggakan.
- Tenant Laporan Saya menampilkan laporan maintenance sendiri dan form pengajuan dengan upload foto opsional.
- Tenant Riwayat menampilkan pembayaran lunas dan riwayat masa sewa.
- No migration; existing RLS and services are reused.


### Slice 10 — tenant self-edit profile (no migration)
- FR-130: tenant dapat mengubah full_name dan phone miliknya sendiri melalui payload yang di-whitelist; role, id, dan ownership tidak tersedia untuk diedit.
- Email login tampil read-only; perubahan email tidak dilakukan dari profil karena auth.users.email tetap menjadi sumber identitas.
- Ditambahkan getMyProfile / updateMyProfile, schema guarded, dan refresh profile context setelah save.
- Verification: tests disiapkan; local typecheck/build/test harus dijalankan setelah pull.

### Slice 9 COMPLETE — tenant dashboard (no migration)
- FR-132: Halo {nama}, kamar Saya & harga/bulan, masa sewa countdown (via rental.ts), tagihan aktif terdekat + sisa + [Bayar Sekarang] -> /tenant/payments, Laporan Saya ringkasan aktif & in_progress + link -> /tenant/reports.
- Informative empty states saat tanpa data sewa/tagihan/laporan. Read-only (tanpa mutasi langsung).
- Tests 115/115 local, typecheck, build PASS.

### Slice 8 COMPLETE — owner dashboard expansion (no migration)
- Existing KPI preserved (FR-010..013). Added Laporan Maintenance (aktif + sedang diproses + 5 terbaru), sewa berakhir 0–30 hari Jakarta via rental.ts, Pembayaran Perlu Ditindaklanjuti (overdue dulu).
- Data nyata only; no fake trend. Tests 108/108 local, typecheck, build PASS.

### Slice 7 COMPLETE — payment expansion + simulated tenant payment (migration pending manual apply)
- Additive: payment_reference/payment_url/paid_at + qris in method CHECK; status trigger + canonical columns preserved.
- Tenant: SELECT own only (rename-consolidate, incl. history); NO tenant INSERT/UPDATE/DELETE; completion only via SECURITY DEFINER RPC start_simulated_payment (id+method, full-pay SIMULASI-*, idempotent, search_path='' , EXECUTE authenticated-only).
- UI: owner QRIS option; tenant /tenant/payments bills + method select + explicit SIMULASI confirm + history.
- Real gateway OUT OF SCOPE (FR-122). Tests 102/102 local, typecheck, build PASS. Live apply NOT done.

### Slice 6 COMPLETE — private maintenance photo storage (migration pending manual apply)
- Private bucket + 3 Storage RLS + image_url guard trigger + 2-step service + signed URL display.
- Tests 85/85 local, typecheck, build PASS. Live apply NOT done.

### Slice 5 COMPLETE — maintenance reports lifecycle (migration pending manual apply)
- maintenance_reports table + forward-only lifecycle trigger + integrity trigger + 7 RLS policies.
- Zod create/tenant-update/owner-update schemas; service without storage (Slice 6).
- Tests 75/75 local (26 maintenance), typecheck, build PASS. Live apply NOT done — user applies via SQL Editor.

### Slice 4 COMPLETE — rental countdown utility (computed, no DB change)
- src/lib/rental.ts: Jakarta calendar-date daysRemaining, 7 buckets incl. open_ended, id labels.
- Tests 62/62 (19 rental incl. midnight-boundary + leap + invalid), typecheck, build PASS.

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
