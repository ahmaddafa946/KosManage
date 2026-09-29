# PRD — KosManage

## Product Overview

**KosManage** adalah aplikasi desktop (Windows) untuk owner/pengelola kos kecil hingga menengah agar dapat mengelola kamar, penghuni, pembayaran sewa, dashboard operasional, dan laporan sederhana dalam satu tempat.

Stack target: Tauri 2, React + TypeScript + Vite, Tailwind, shadcn/ui, Supabase (Auth + PostgreSQL).

## Problem Statement

Banyak owner masih memakai kombinasi catatan manual, WhatsApp, spreadsheet, dan kalender. Akibatnya:

- status kamar sulit dipantau
- data penghuni tersebar
- riwayat pembayaran sulit dilacak
- tunggakan mudah terlewat
- informasi sederhana membutuhkan waktu lama

## Vision

Menjadi pusat informasi operasional kos yang sederhana, cepat, aman, dan mudah dipelajari — tanpa kompleksitas software enterprise.

## Goals

1. Menjawab tiga pertanyaan inti dengan cepat:
   - Kamar mana yang kosong?
   - Siapa yang tinggal di setiap kamar?
   - Siapa yang sudah/belum membayar?
2. Mencatat pembayaran dan tunggakan secara konsisten.
3. Menyediakan dashboard dan laporan operasional sederhana.
4. Membangun fondasi aman (Auth + RLS + integritas data) yang siap dikembangkan.

## Non-Goals (MVP)

- Payment gateway / QRIS otomatis
- Notifikasi WhatsApp / email
- Booking online / kontrak digital
- Manajemen utilitas lanjutan
- Multi-property UI / staff role
- Aplikasi mobile untuk penghuni
- AI assistant
- Offline-first penuh

## Target Users

Owner/pengelola kos skala **5–50 kamar**, biasanya **1 owner**. Bukan administrator enterprise.

Prioritas UX: mudah dipelajari, minim klik, informasi penting mudah ditemukan, tampilan bersih.

## User Personas

### Persona 1 — Budi (Owner kos 20 kamar)

- Usia 35–50, mengelola kos sendiri
- Terbiasa Excel/WhatsApp, bukan power user software
- Butuh tahu kamar kosong dan siapa yang menunggak hari ini
- Frustrasi: lupa follow-up tunggakan

### Persona 2 — Sari (Pengelola kecil, 8 kamar)

- Mencatat pembayaran cash & transfer manual
- Butuh riwayat per penghuni saat ada sengketa
- Frustrasi: data tersebar di chat

## User Pain Points

1. Tidak ada satu sumber kebenaran status kamar.
2. Sulit melihat tunggakan secara agregat.
3. Riwayat pembayaran tidak terstruktur.
4. Proses cek harian memakan waktu.

## User Stories

### Kamar

- Sebagai owner kos, saya ingin melihat status seluruh kamar, sehingga saya dapat mengetahui kamar kosong tanpa mengecek satu per satu.
- Sebagai owner, saya ingin menambah/mengubah/menghapus kamar, sehingga data inventaris selalu akurat.
- Sebagai owner, saya ingin memfilter kamar maintenance, sehingga saya tidak menawarkan kamar yang sedang diperbaiki.

### Penghuni

- Sebagai owner, saya ingin menambahkan penghuni ke kamar available, sehingga hunian tercatat dan kamar bertatus terisi.
- Sebagai owner, saya ingin melihat detail penghuni beserta riwayat bayar, sehingga saya siap saat ada pertanyaan.
- Sebagai owner, saya ingin menonaktifkan penghuni yang checkout, sehingga kamar kembali tersedia.

### Pembayaran

- Sebagai owner, saya ingin mencatat tagihan dan pembayaran per periode, sehingga status lunas/sebagian/belum/terlambat jelas.
- Sebagai owner, saya ingin memfilter riwayat pembayaran, sehingga saya cepat menemukan transaksi tertentu.
- Sebagai owner, saya ingin melihat total tunggakan, sehingga saya tahu siapa yang perlu ditagih.

### Dashboard

- Sebagai owner, saya ingin membuka aplikasi dan langsung melihat ringkasan kos, sehingga saya paham kondisi operasional dalam hitungan detik.
- Sebagai owner, saya ingin melihat pembayaran terbaru dan yang jatuh tempo, sehingga saya tahu aksi harian.

### Laporan

- Sebagai owner, saya ingin melihat occupancy rate, sehingga saya memahami tingkat hunian.
- Sebagai owner, saya ingin melihat ringkasan pendapatan per periode, sehingga saya tahu performa kas.

## User Journey

1. Owner menginstal/menjalankan KosManage.
2. Login dengan email/password.
3. (Pertama kali) property utama tersedia sebagai konteks data.
4. Mengisi kamar → menambah penghuni → mencatat pembayaran.
5. Setiap hari: buka Dashboard → cek kosong/tunggakan → tindak lanjut di luar app (chat/telepon).
6. Periodik: buka Laporan untuk rekap bulanan.

## User Flow

### Flow A — Login

```text
Launch → Login → Supabase Auth → Dashboard
```

### Flow B — Tambah Kamar

```text
Dashboard → Kamar → Tambah Kamar → Submit → Validasi → Supabase → Success → Room List
```

### Flow C — Tambah Penghuni

```text
Dashboard → Penghuni → Tambah → Pilih kamar available → Submit
→ Create tenant → Room becomes occupied
```

### Flow D — Pembayaran

```text
Pembayaran → Tambah → Pilih tenant → Periode + nominal → Submit
→ Validasi → Save → Status dihitung DB → Dashboard updated
```

## Feature Requirements

Ringkasan (detail ID di `REQUIREMENTS.md`):

| Modul | Fitur MVP |
|-------|-----------|
| Auth | Login, logout, session, proteksi route |
| Dashboard | Summary KPI, recent, upcoming, outstanding |
| Kamar | CRUD, search, filter, sort, detail |
| Penghuni | CRUD/archive, search, filter, payment history |
| Pembayaran | CRUD, status otomatis, riwayat + filter |
| Laporan | Occupancy + income dengan filter periode |
| Pengaturan | Profil dasar, edit property, logout |

## Business Rules

1. Nomor kamar unik dalam satu property.
2. Kamar occupied tidak dapat diberikan ke tenant aktif lain.
3. Kamar maintenance tidak untuk tenant baru.
4. Tenant aktif wajib punya room.
5. Tenant inactive tidak dihitung sebagai penghuni aktif.
6. Payment harus terikat tenant (dan property) valid milik owner.
7. Nominal payment tidak boleh negatif.
8. Status payment konsisten dengan nominal + due date (DB).
9. Data owner tidak dapat diakses owner lain (RLS).
10. Penghapusan mempertimbangkan relasi (occupied room tidak dihapus).
11. Saat tenant aktif menempati room → `room.status = occupied`.
12. Saat tidak ada tenant aktif di room → `room.status = available` (kecuali sengaja `maintenance`).

## Edge Cases

### Room

- Nomor kamar duplikat → ditolak.
- Hapus room occupied → ditolak.
- Room maintenance dipilih untuk tenant → ditolak.
- Inkonsistensi status vs tenant → dicegah trigger.

### Tenant

- Tenant aktif tanpa room → ditolak.
- Assign ke room occupied → ditolak.
- Overlap tanggal dengan tenant aktif lain di room sama → dicegah oleh unique active-per-room.
- Inactive tetap punya history payment.

### Payment

- Amount negatif → ditolak.
- `amount_paid > amount_due` → diizinkan sebagai overpay sederhana; status `paid` (AS: tidak buat refund engine).
- Partial / late / missing due_date → due_date wajib; partial & overdue dihitung DB.
- Duplikat periode sama untuk tenant → dicegah unique `(tenant_id, billing_period)` bila memungkinkan.
- Tenant dihapus/diarsipkan dengan payments → payments tetap (FK restrict atau set tenant inactive saja).

### Auth

- Kredensial salah → pesan ramah.
- Session expired → redirect login.
- Akses tanpa auth → ditolak.

## Success Metrics (MVP / prototype)

- Owner dapat menjawab 3 pertanyaan inti < 10 detik dari Dashboard/list.
- Alur tambah kamar → penghuni → pembayaran selesai tanpa error integrity.
- Zero cross-owner data leak pada uji RLS.
- Typecheck + tests inti + build sukses (setelah implementasi).

## MVP Scope

```text
AUTH → DASHBOARD → ROOMS → TENANTS → PAYMENTS → REPORTS
```

## Future Scope

WhatsApp, QRIS/gateway, reminder otomatis, email, booking, kontrak digital, utilitas, multi-property advanced, staff, tenant app, sync offline, AI assistant.

## Acceptance Criteria

### Authentication
- Login, logout, session bekerja.

### Rooms
- CRUD, search, filter, status benar, anti double-occupancy.

### Tenants
- CRUD/archive, terikat room, tidak double occupancy.

### Payments
- CRUD, status benar, tunggakan terhitung, history tersedia.

### Dashboard
- Summary, recent, outstanding benar.

### Reports
- Occupancy & income terhitung dengan filter.

### Security
- RLS aktif, ownership tegak, secret tidak bocor.

### Quality
- Typecheck, tests, production build berhasil (pasca implementasi aplikasi).

## Referensi dokumen

- `REQUIREMENTS.md` — ID requirement
- `ASSUMPTIONS.md` — asumsi MVP
- `ARCHITECTURE.md` — arsitektur
- `DATABASE.md` — schema
- `UI-UX.md` — desain antarmuka
- `SECURITY.md` — keamanan

---

# v2.0 — OWNER & TENANT EXPANSION (approved spec delta)

> No Liquid Glass redesign in v2.0. Product capability focus only.
> Audit decisions D1–D9 are binding. Product baseline: v1.0.

## v2.0 Capability Map

| Module ID | Responsibility | Depends on |
|---|---|---|
| identity-role | profiles.role (owner/tenant), tenants.profile_id link | — |
| owner-dashboard | owner KPI expansion (maintenance, expiry, arrears) | identity-role |
| tenant-dashboard | tenant home (room, rental, bills, reports) | identity-role |
| facilities | master facilities + room_facilities M2M, checkbox UI | identity-role |
| rental-period | days_remaining computed, Asia/Jakarta | identity-role |
| maintenance-reports | reports lifecycle + categories/priorities | identity-role |
| payment-expansion | qris + reference/url/paid_at additive, simulated flow | identity-role |
| tenant-profile | tenant self-profile edit (guarded) | identity-role |
| reports | operational (Laporan) vs financial (Laporan Keuangan) split | above modules |
| security-rls | cross-cutting RLS + Storage policies | all |

Build order: identity-role → owner-dashboard, tenant-dashboard → facilities, rental-period, maintenance-reports, payment-expansion, tenant-profile → reports. security-rls cross-cutting.

## v2.0 Roles

- Owner: dashboard, property, rooms, master facilities, tenants, rental periods, payments, arrears, maintenance view/process, financial reports, settings. Owner sees only owned properties.
- Tenant: dashboard, own room + facilities, rental dates + days remaining, bills, simulated payment flow, history, own maintenance reports + photo upload, own profile. Tenant cannot see other tenants/rooms/properties.

## v2.0 Scope Additions

- Master facilities per property + room_facilities M2M; room create/edit uses CHECKBOX + [+ Tambahkan Fasilitas] inline; inactive hidden by default; legacy rooms.facilities preserved read-only (see DATABASE.md).
- Rental period: start_date/end_date visible to both roles; days_remaining computed, never stored; buckets >30 normal, 15–30 attention, 7–14 soon, 1–6 very soon, 0 expired, <0 past due; timezone Asia/Jakarta.
- Maintenance reports: category AC/electrical/plumbing/furniture/internet/other; priority low/medium/high; status submitted→in_progress→resolved→closed; tenant cannot set resolved/closed; resolved_at on resolve transition only.
- Photo: private bucket maintenance-reports, path {property_id}/{tenant_id}/{report_id}/{filename}; two-step flow (create report → upload → update image_url); signed URLs for display.
- Payments: keep status/payment_method/payment_date canonical; add qris method + payment_reference/payment_url/paid_at additive; no real gateway; simulation clearly labeled.
- Navigation owner: Dashboard, Kamar, Penghuni, Pembayaran, Laporan (operational/maintenance), Laporan Keuangan, Pengaturan. Tenant: Dashboard, Kamar Saya, Pembayaran, Laporan Saya (maintenance), Riwayat (payment/rental history), Profil. RLS enforces, not menu hiding.
