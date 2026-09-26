# REQUIREMENTS — KosManage

Hybrid document: requirement statements may use Bahasa Indonesia where user-facing; IDs, structure, and technical notes in English.

Each requirement includes: **ID**, **requirement**, **description**, **priority** (MoSCoW), **acceptance criteria**.

Priority legend: **Must** | **Should** | **Could** | **Won't** (MVP)

---

## 1. Functional Requirements

### Authentication

#### FR-001
**Requirement:** Owner dapat login ke aplikasi.  
**Description:** Login memakai email + password melalui Supabase Auth.  
**Priority:** Must  
**Acceptance criteria:**
- Form login menerima email dan password.
- Kredensial valid menghasilkan session dan redirect ke Dashboard.
- Kredensial invalid menampilkan pesan error ramah (tanpa stack trace).

#### FR-002
**Requirement:** Owner dapat logout.  
**Description:** Mengakhiri session Supabase dan mengembalikan user ke layar login.  
**Priority:** Must  
**Acceptance criteria:**
- Setelah logout, protected routes tidak dapat diakses.
- Session lokal dibersihkan.

#### FR-003
**Requirement:** Session bertahan antar pembukaan aplikasi.  
**Description:** Session Supabase dipersist sesuai mekanisme client resmi.  
**Priority:** Must  
**Acceptance criteria:**
- Menutup dan membuka ulang aplikasi dengan session valid membawa user ke Dashboard.
- Session kedaluwarsa mengarahkan ke login.

#### FR-004
**Requirement:** Route terproteksi menolak akses tanpa autentikasi.  
**Description:** UI tidak menampilkan data operasional tanpa user terautentikasi.  
**Priority:** Must  
**Acceptance criteria:**
- Akses langsung ke halaman kamar/penghuni/pembayaran tanpa session → login.

---

### Dashboard

#### FR-010
**Requirement:** Owner dapat melihat dashboard ringkasan kos.  
**Description:** Halaman utama menampilkan KPI operasional.  
**Priority:** Must  
**Acceptance criteria:**
- Menampilkan: Total Kamar, Kamar Terisi, Kamar Kosong, Kamar Maintenance, Total Penghuni, Pendapatan Bulan Ini, Total Tunggakan.

#### FR-011
**Requirement:** Dashboard menampilkan pembayaran terbaru.  
**Description:** Daftar transaksi/tagihan terbaru (recent payments).  
**Priority:** Must  
**Acceptance criteria:**
- Minimal 5 item terbaru berdasarkan `updated_at` atau `payment_date`.
- Empty state jika belum ada data.

#### FR-012
**Requirement:** Dashboard menampilkan jatuh tempo mendatang.  
**Description:** Upcoming due dates untuk tagihan belum lunas.  
**Priority:** Must  
**Acceptance criteria:**
- Menampilkan pembayaran unpaid/partial/overdue dengan `due_date` dalam jendela relevan (mis. 14 hari ke depan + yang sudah lewat untuk outstanding).

#### FR-013
**Requirement:** Dashboard menampilkan tunggakan.  
**Description:** Outstanding payments (belum lunas).  
**Priority:** Must  
**Acceptance criteria:**
- Status unpaid, partial, overdue terlihat.
- Nominal sisa (`amount_due - amount_paid`) dapat dipahami.

---

### Rooms (Kamar)

#### FR-020
**Requirement:** Owner dapat membuat kamar.  
**Description:** Insert room dengan nomor, lantai, harga, status, fasilitas, catatan.  
**Priority:** Must  
**Acceptance criteria:**
- Validasi Zod lulus sebelum submit.
- Nomor kamar unik per property (DB constraint).
- Status awal default `available` kecuali di-set `maintenance`.

#### FR-021
**Requirement:** Owner dapat melihat daftar kamar.  
**Description:** List dengan search, filter status, sort.  
**Priority:** Must  
**Acceptance criteria:**
- Search by room_number.
- Filter: available / occupied / maintenance.
- Sort by room_number, price, status.

#### FR-022
**Requirement:** Owner dapat melihat detail kamar.  
**Description:** Detail termasuk penghuni aktif jika ada.  
**Priority:** Must  
**Acceptance criteria:**
- Menampilkan field room + tenant aktif (jika occupied).

#### FR-023
**Requirement:** Owner dapat mengubah kamar.  
**Description:** Update field room kecuali pelanggaran business rule.  
**Priority:** Must  
**Acceptance criteria:**
- Update tersimpan dan tercermin di list/detail.
- Tidak dapat mengalihkan status dengan cara yang melanggar occupancy (lihat business rules).

#### FR-024
**Requirement:** Owner dapat menghapus kamar jika tidak ada dependency aktif.  
**Description:** Delete room tanpa tenant aktif.  
**Priority:** Must  
**Acceptance criteria:**
- Room dengan tenant aktif tidak dapat dihapus.
- Room kosong dapat dihapus; UI menampilkan konfirmasi.

#### FR-025
**Requirement:** Kamar occupied tidak dapat diberikan ke tenant aktif lain.  
**Description:** Enforce satu tenant aktif per room.  
**Priority:** Must  
**Acceptance criteria:**
- Attempt assign kedua gagal di DB (unique partial index / trigger).
- UI menampilkan error ramah.

#### FR-026
**Requirement:** Kamar maintenance tidak dapat dipilih untuk tenant baru.  
**Description:** Filter + validasi server-side.  
**Priority:** Must  
**Acceptance criteria:**
- Room picker hanya menampilkan `available`.
- Insert tenant ke room maintenance ditolak DB/app logic.

---

### Tenants (Penghuni)

#### FR-030
**Requirement:** Owner dapat menambah penghuni.  
**Description:** Create tenant aktif pada room available.  
**Priority:** Must  
**Acceptance criteria:**
- Setelah sukses, `rooms.status = occupied`.
- Field wajib: name, room_id, start_date, rent_price, status=active.

#### FR-031
**Requirement:** Owner dapat melihat daftar dan detail penghuni.  
**Description:** Search, filter status, lihat riwayat pembayaran.  
**Priority:** Must  
**Acceptance criteria:**
- Search by name / phone.
- Filter active / inactive.
- Detail menampilkan payment history terkait.

#### FR-032
**Requirement:** Owner dapat mengubah data penghuni.  
**Description:** Update profil dan tanggal; pindah kamar hanya ke room available.  
**Priority:** Must  
**Acceptance criteria:**
- Update tersimpan.
- Pindah kamar memperbarui occupancy kedua room (lama → available jika tidak ada aktif lain; baru → occupied).

#### FR-033
**Requirement:** Owner dapat menonaktifkan / mengarsipkan penghuni.  
**Description:** Set status `inactive`, set `end_date` bila relevan.  
**Priority:** Must  
**Acceptance criteria:**
- Room menjadi `available` jika tidak ada tenant aktif lain.
- Riwayat payment tetap ada.

#### FR-034
**Requirement:** Tenant aktif wajib memiliki room.  
**Description:** Check constraint / NOT NULL room_id untuk active.  
**Priority:** Must  
**Acceptance criteria:**
- Insert/update active tanpa room_id ditolak.

---

### Payments (Pembayaran)

#### FR-040
**Requirement:** Owner dapat membuat tagihan/pembayaran.  
**Description:** Create payment untuk tenant dengan periode, due_date, amount_due, amount_paid, method.  
**Priority:** Must  
**Acceptance criteria:**
- Status dihitung DB sesuai aturan FR-044.
- amount tidak negatif.

#### FR-041
**Requirement:** Owner dapat melihat riwayat pembayaran.  
**Description:** List dengan search, filter bulan/status/metode, sort, pagination bila perlu.  
**Priority:** Must  
**Acceptance criteria:**
- Kolom: Tanggal, Penghuni, Kamar, Periode, Tagihan, Dibayar, Status.
- Filter status dan metode berfungsi.

#### FR-042
**Requirement:** Owner dapat mengubah pembayaran.  
**Description:** Update amount_paid, method, notes, dates; status dihitung ulang.  
**Priority:** Must  
**Acceptance criteria:**
- Setelah update partial→paid, status `paid`.
- Overdue diterapkan jika lewat due_date dan belum lunas.

#### FR-043
**Requirement:** Owner dapat menghapus pembayaran bila diperlukan.  
**Description:** Delete payment record (dengan konfirmasi).  
**Priority:** Should  
**Acceptance criteria:**
- Delete hanya untuk data milik owner (RLS).
- Konfirmasi UI sebelum hapus.

#### FR-044
**Requirement:** Status pembayaran konsisten dengan nominal dan due date.  
**Description:**
- `amount_paid = 0` → unpaid (atau overdue jika lewat due)
- `0 < amount_paid < amount_due` → partial (atau overdue jika lewat due)
- `amount_paid >= amount_due` → paid
- Lewat due_date dan belum lunas → overdue  
**Priority:** Must  
**Acceptance criteria:**
- Client tidak dapat memaksa status salah; trigger/function DB mengoverride.

---

### Reports (Laporan)

#### FR-050
**Requirement:** Owner dapat melihat laporan hunian (occupancy).  
**Description:** Total, occupied, available, maintenance, occupancy rate.  
**Priority:** Must  
**Acceptance criteria:**
- Occupancy rate = occupied / total rooms (handle total=0).

#### FR-051
**Requirement:** Owner dapat melihat laporan pendapatan.  
**Description:** Total tagihan, total dibayar, tunggakan, pendapatan untuk filter periode.  
**Priority:** Must  
**Acceptance criteria:**
- Filter: bulan ini, bulan lalu, 3 bulan, 6 bulan.
- Angka konsisten dengan data payments.

#### FR-052
**Requirement:** Chart visual tidak wajib di MVP.  
**Description:** Tabel/ringkasan angka cukup.  
**Priority:** Won't  
**Acceptance criteria:**
- Tidak ada dependency chart library hanya untuk dekorasi.

---

### Property

#### FR-060
**Requirement:** Setiap owner memiliki property yang menjadi konteks data.  
**Description:** MVP auto-provision atau setup property tunggal setelah login pertama.  
**Priority:** Must  
**Acceptance criteria:**
- Rooms/tenants/payments selalu terikat `property_id` milik owner.
- Schema mendukung >1 property tanpa breaking change besar.

#### FR-061
**Requirement:** Multi-property UI switcher.  
**Description:** Future.  
**Priority:** Won't  
**Acceptance criteria:** N/A untuk MVP.

---

### Settings

#### FR-070
**Requirement:** Halaman pengaturan menampilkan profil dasar dan logout.  
**Description:** Minimal settings untuk MVP.  
**Priority:** Should  
**Acceptance criteria:**
- Menampilkan email user.
- Tombol logout berfungsi.

#### FR-071
**Requirement:** Edit nama property.  
**Description:** Owner dapat mengubah nama/alamat kos.  
**Priority:** Should  
**Acceptance criteria:**
- Update tersimpan dan terlihat di UI.

---

## 2. Non-Functional Requirements

#### NFR-001
**Requirement:** Perceived performance cepat untuk skala 5–50 kamar.  
**Description:** Dashboard dan list utama responsif.  
**Priority:** Must  
**Acceptance criteria:**
- Hindari N+1 query berlebihan; list memakai query tertarget.

#### NFR-002
**Requirement:** Usability — minim klik untuk tugas inti.  
**Description:** Tambah kamar / penghuni / bayar ≤ beberapa langkah jelas.  
**Priority:** Must  
**Acceptance criteria:**
- Flow A–D di PRD dapat diselesaikan tanpa dokumentasi panjang.

#### NFR-003
**Requirement:** Accessibility dasar.  
**Description:** Keyboard nav, focus, contrast, labels, aria pada icon-only.  
**Priority:** Should  
**Acceptance criteria:**
- Form punya label; icon button punya aria-label.

#### NFR-004
**Requirement:** Reliability — data integrity di database.  
**Description:** Constraints + triggers sebagai source of truth.  
**Priority:** Must  
**Acceptance criteria:**
- Double occupancy must fail.
- Invalid payment amounts must fail.

#### NFR-005
**Requirement:** Maintainability — struktur feature-oriented, TypeScript strict.  
**Description:** Lihat ARCHITECTURE.md dan AGENTS.md.  
**Priority:** Must  
**Acceptance criteria:**
- Tidak ada `any` tanpa alasan terdokumentasi.
- Business rules tidak diduplikasi tanpa sumber bersama (DB + shared validation).

#### NFR-006
**Requirement:** Security — RLS ownership, no service-role in client.  
**Description:** Lihat SECURITY.md.  
**Priority:** Must  
**Acceptance criteria:**
- Owner A tidak dapat membaca data owner B.
- `.env` tidak di-commit.

#### NFR-007
**Requirement:** Window adaptif untuk resolusi desktop umum.  
**Description:** 1280×720 hingga 1920×1080.  
**Priority:** Should  
**Acceptance criteria:**
- Sidebar collapse pada window sempit; tabel scroll horizontal.

#### NFR-008
**Requirement:** Offline behavior MVP = online-required.  
**Description:** AS-012.  
**Priority:** Must  
**Acceptance criteria:**
- Error jaringan menampilkan pesan ramah, bukan crash.

#### NFR-009
**Requirement:** Typecheck, unit tests inti, dan production build berhasil sebelum rilis.  
**Description:** Gate kualitas.  
**Priority:** Must  
**Acceptance criteria:**
- `tsc --noEmit`, Vitest, `tauri build` sukses (setelah bootstrap).

---

## 3. Security Requirements

#### SEC-001
**Requirement:** Autentikasi melalui Supabase Auth saja.  
**Priority:** Must  
**Acceptance criteria:** Password tidak disimpan di aplikasi lokal sendiri.

#### SEC-002
**Requirement:** RLS aktif di semua tabel data.  
**Priority:** Must  
**Acceptance criteria:** Policy memakai ownership predicate, bukan hanya `TO authenticated`.

#### SEC-003
**Requirement:** Service-role key tidak pernah ada di desktop client.  
**Priority:** Must  
**Acceptance criteria:** Hanya anon/publishable key + URL di `.env`.

#### SEC-004
**Requirement:** Validasi input client (Zod) dan constraint DB.  
**Priority:** Must  
**Acceptance criteria:** Payload invalid ditolak sebelum/atau oleh DB.

#### SEC-005
**Requirement:** Secret tidak di-commit; sediakan `.env.example`.  
**Priority:** Must  
**Acceptance criteria:** `.gitignore` mencakup `.env*`; example tanpa nilai rahasia.

#### SEC-006
**Requirement:** UPDATE policy mencegah pemindahan row ke owner lain.  
**Priority:** Must  
**Acceptance criteria:** `USING` dan `WITH CHECK` keduanya enforce ownership.

#### SEC-007
**Requirement:** Error user-facing tidak membocorkan detail internal.  
**Priority:** Must  
**Acceptance criteria:** Stack trace hanya di developer logs.

#### SEC-008
**Requirement:** Least privilege pada data access.  
**Priority:** Must  
**Acceptance criteria:** Client hanya operasi yang diizinkan RLS untuk owner tersebut.

---

## 4. MoSCoW Summary (MVP)

| Priority | Items |
|----------|--------|
| Must | Auth, Dashboard, Rooms CRUD+rules, Tenants CRUD+rules, Payments+status, Reports dasar, RLS, integrity |
| Should | Payment delete, Settings dasar, a11y, responsive polish |
| Could | Notification UI placeholder, advanced sorting preferences |
| Won't | Payment gateway, WhatsApp, multi-property UI, staff roles, charts dekoratif, tenant mobile app |

---

## 5. Traceability

| Area | Requirement IDs |
|------|-----------------|
| Auth | FR-001–004, SEC-001 |
| Dashboard | FR-010–013 |
| Rooms | FR-020–026 |
| Tenants | FR-030–034 |
| Payments | FR-040–044 |
| Reports | FR-050–052 |
| Property | FR-060–061 |
| Settings | FR-070–071 |
| Quality/Security | NFR-*, SEC-* |
