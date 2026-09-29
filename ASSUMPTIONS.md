# ASSUMPTIONS — KosManage

Dokumen ini mencatat keputusan yang merupakan asumsi untuk MVP. Jika asumsi berubah, update dokumen ini dan dampaknya ke requirement, schema, serta UI.

| ID | Asumsi | Dampak jika berubah |
|----|--------|---------------------|
| AS-001 | MVP ditujukan untuk **satu property utama per owner**. Schema tetap mendukung multiple properties di masa depan. | Perlu UI pemilihan property dan switcher konteks. |
| AS-002 | **Satu kamar hanya boleh memiliki satu tenant aktif** pada satu waktu. | Model shared room / multi-bed memerlukan redesign constraint. |
| AS-003 | Payment gateway (QRIS, VA, e-wallet API) **tidak termasuk MVP**. Pembayaran dicatat manual. | Perlu integrasi payment + webhook + status eksternal. |
| AS-004 | Notifikasi WhatsApp / email / reminder otomatis **tidak termasuk MVP**. | Perlu channel eksternal, template, dan jadwal. |
| AS-005 | Bahasa UI produk adalah **Bahasa Indonesia**. Dokumentasi teknis utama berbahasa Inggris. | Perlu i18n jika multi-bahasa. |
| AS-006 | Package manager resmi adalah **npm**. | Perlu migrasi lockfile jika pindah ke pnpm/yarn. |
| AS-007 | Autentikasi MVP hanya **email + password** via Supabase Auth. | Social login / magic link menambah flow auth. |
| AS-008 | Satu payment record merepresentasikan **satu tagihan per periode** (`billing_period`) untuk satu tenant, dengan `amount_paid` terakumulasi. | Model ledger multi-transaksi per periode memerlukan tabel `payment_transactions`. |
| AS-009 | Status pembayaran (`unpaid` / `partial` / `paid` / `overdue`) dihitung di **database**, bukan dipercaya dari client. | Perubahan formula status harus di migration. |
| AS-010 | Penghapusan room yang masih memiliki tenant aktif **ditolak**. Tenant inactive + history payment dipertahankan (soft archive via status, hard delete hanya jika aman). | Soft-delete global atau cascade policy berbeda. |
| AS-011 | Owner adalah satu-satunya peran di MVP. Staff / multi-role **belum ada**. | Perlu tabel membership/roles dan RLS berbasis role. |
| AS-012 | Aplikasi offline-first penuh **bukan** target MVP. Butuh koneksi untuk auth dan data Supabase. Cache lokal terbatas boleh ditambah kemudian. | Sync engine / local SQLite dual-write. |
| AS-013 | Storage file (KTP scan, kontrak PDF) **tidak termasuk MVP**. Field teks identitas cukup. | Bucket Supabase Storage + RLS object. |
| AS-014 | Target desktop utama: **Windows 10/11** via Tauri 2. Platform lain adalah future. | CI/build multi-OS. |
| AS-015 | Seed data development memakai akun auth dummy yang didokumentasikan; bukan data pribadi nyata. | Seed harus di-reset per environment. |

## Keputusan prioritas konflik

Jika requirement bentrok, urutan prioritas:

1. Security  
2. Data integrity  
3. Core functionality  
4. Usability  
5. Performance  
6. Maintainability  
7. Visual polish  
8. Nice-to-have  

## Catatan prototype

Prototype harus sederhana, tetapi foundation (schema, RLS, ownership, validation) harus benar. Jangan menonaktifkan RLS atau memakai service-role key di client untuk “mempercepat” development.

---

# v2.0 Assumptions Append (D1–D9)

| ID | Asumsi | Dampak jika berubah |
|----|--------|---------------------|
| AS-016 | profiles.role owner/tenant; default owner existing | Role tambahan = RLS ulang |
| AS-017 | profiles.email display copy; auth.users.email auth source | Sync strategy berubah bila single-source |
| AS-018 | tenants.profile_id link; 1 active per profile | Multi-tenancy aktif = constraint ulang |
| AS-019 | rooms.facilities legacy preserved read-only | Drop kolom = migrasi destruktif terpisah |
| AS-020 | private.is_property_owner hardened (D5) | Ganti model helper = review semua policy |
| AS-021 | Storage private maintenance-reports + signed URL | Public bucket = threat model ulang |
| AS-022 | days_remaining computed Asia/Jakarta, tidak disimpan | Persist = sync/trigger baru |
| AS-023 | Laporan vs Laporan Keuangan split (D8) | Gabung = nav/report refactor |
| AS-024 | Payment gateway nyata out of scope; simulasi berlabel | Gateway nyata = PCI/webhook scope baru |
| AS-025 | Baseline produk v1.0; metadata 0.1.0 legacy sync di final v2.0 | Rilis perantara = versi +0.5 sia-sia |

| AS-030 | Maintenance forward-only, no skip/reopen; NO delete (FR-110..112 never grant it — v1 parity is not a permit); report room = tenant current room; resolved_at retained on closed | Narrowest FR-111; review 2026-09-30 removed invented owner-delete |

| AS-031 | Photo max 5MB; MIME JPEG/PNG/WebP; signed URL TTL 1h; no photo replacement/deletion (single image_url) | SSOT silent on exact limits — conservative MVP; bucket + RLS authoritative |
