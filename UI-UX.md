# UI-UX — KosManage

## Prinsip visual

- Minimal, modern, clean, professional, calm, readable
- Minim klik untuk tugas inti
- Informasi penting mudah ditemukan
- Jangan mengandalkan warna saja untuk status — gabungkan icon, teks, dan badge

## Tipografi

**Font:** Inter (sesuai spesifikasi produk MVP)

## Palet warna

| Token | Hex | Penggunaan |
|-------|-----|------------|
| Primary | `#2563EB` | Aksi utama, fokus |
| Background | `#F8FAFC` | Latar aplikasi |
| Surface | `#FFFFFF` | Panel konten |
| Text | `#0F172A` | Teks utama |
| Muted | `#64748B` | Teks sekunder |
| Success | `#16A34A` | Lunas / sukses |
| Warning | `#F59E0B` | Partial / perhatian |
| Danger | `#DC2626` | Overdue / error |
| Border | `#E2E8F0` | Garis / pemisah |

Status kamar: available / occupied / maintenance — badge + label teks.  
Status bayar: unpaid / partial / paid / overdue — badge + label teks.

## Bahasa UI

Bahasa Indonesia untuk semua copy user-facing (label, empty state, error).

## Layout desktop

```text
┌─────────────────────────────────────────────┐
│ Sidebar │ Topbar                            │
│         ├───────────────────────────────────┤
│         │                                   │
│         │          Main Content             │
│         │                                   │
└─────────────────────────────────────────────┘
```

### Sidebar

- Dashboard
- Kamar
- Penghuni
- Pembayaran
- Laporan
- Pengaturan

Sidebar dapat di-collapse. Icon: Lucide React.

### Topbar

- Judul halaman
- Search kontekstual (jika relevan)
- Slot notifikasi (placeholder MVP — tanpa backend notifikasi)
- Menu profil (email + logout)

## Halaman / layar

| Route | Halaman | Konten utama |
|-------|---------|--------------|
| `/login` | Login | Email, password, submit |
| `/` | Dashboard | KPI, recent, upcoming, outstanding |
| `/rooms` | Daftar kamar | Table/list + filter + CTA Tambah |
| `/rooms/new` atau modal | Form kamar | |
| `/rooms/:id` | Detail kamar | + penghuni aktif |
| `/tenants` | Daftar penghuni | |
| `/tenants/new` | Form penghuni | Room picker = available only |
| `/tenants/:id` | Detail + riwayat bayar | |
| `/payments` | Riwayat pembayaran | Filter bulan/status/metode |
| `/payments/new` | Form pembayaran | |
| `/reports` | Laporan | Occupancy + income + filter periode |
| `/settings` | Pengaturan | Profil, nama property, logout |

Gunakan modal/drawer untuk create/edit jika lebih cepat; tetap sediakan navigasi jelas.

## Dashboard

Tampilkan hanya yang penting:

**Summary:** Total Kamar, Terisi, Kosong, Maintenance, Total Penghuni, Pendapatan Bulan Ini, Total Tunggakan.

**Sections:** Recent Payments, Upcoming Due Dates, Outstanding Payments.

Dapat dipahami dalam beberapa detik.

## Komponen (shadcn/ui)

Gunakan fondasi shadcn: Button, Input, Label, Select, Table, Dialog, Badge, Card (hanya untuk interaksi/section yang membutuhkan kontainer), Skeleton, Dropdown Menu, Separator.

Hindari card dekoratif berlebihan di hero dashboard; ringkasan KPI boleh ringkas tanpa “dashboard soup”.

## Empty state

Setiap list kosong wajib menjelaskan + CTA.

Contoh:

```text
Belum ada kamar

Tambahkan kamar pertama Anda.

[+ Tambah Kamar]
```

## Loading state

- Skeleton untuk list/dashboard
- Spinner/indicator ringan bila perlu
- Tombol submit disabled saat request berjalan

## Error state

Pesan ramah Bahasa Indonesia. Tanpa stack trace.

Contoh: `Gagal menyimpan pembayaran. Silakan coba lagi.`

## Responsive (window size)

Prioritas resolusi: 1280×720, 1366×768, 1440×900, 1920×1080.

Pada window kecil:

- Sidebar collapse
- Tabel scroll horizontal
- Grid → satu kolom
- Form satu kolom
- Modal tidak overflow viewport

## Accessibility

- Navigasi keyboard
- Focus state terlihat
- Kontras memadai
- Semantic HTML
- `aria-label` pada icon-only button
- Label form eksplisit
- Pesan error terasosiasi ke field

## Desktop feel

- Minimum window size (mis. 1100×700 — finalkan saat bootstrap Tauri)
- Window title: `KosManage`
- Application icon (saat bootstrap)
- Startup loading singkat
- Close behavior normal

## Motion

Gerakan halus untuk sidebar collapse dan transisi page/dialog — jangan berlebihan.

---

# v2.0 UI Delta (additive only)

## Navigation
- Owner: Dashboard, Kamar, Penghuni, Pembayaran, Laporan (operational/maintenance), Laporan Keuangan, Pengaturan.
- Tenant: Dashboard, Kamar Saya, Pembayaran, Laporan Saya, Riwayat, Profil.

## Facilities
- Room create/edit: CHECKBOX list + [ + Tambahkan Fasilitas ] inline (input nama → save → muncul + auto-checked). Inactive hidden default. Legacy text tidak diedit manual.

## Rental
- Countdown badge: >30 normal, 15–30 attention, 7–14 soon, 1–6 very soon, 0 expired, <0 past due. Tanggal format id-ID Asia/Jakarta.

## Maintenance
- Tenant form: title/desc/category/priority + foto (step 2 setelah create); status timeline submitted→in_progress→resolved→closed; owner table + filter status/category/priority + aksi proses/resolve/close.

## Payments
- Tenant bill card: nominal, due, status badge, pilih metode (cash/transfer/ewallet/qris), [Bayar Sekarang] → simulasi dialog berlabel SIMULASI; history list. Copy Indonesia.

## Dashboards
- Owner: KPI existing + maintenance baru/in-progress + expiry + due. Tenant: Halo {nama}, kamar, Rp/bulan, masa sewa countdown, berakhir, tagihan, status, [Bayar Sekarang], Laporan Saya. Empty states informatif. Tanpa trend palsu.

---

# v3.0 UI Delta (Glassmorphism & Mobile Parity)

## Design System Update: Glassmorphism (Liquid Glass)
- The UI must be updated to a modern Glassmorphism theme to match the mobile app direction.
- Key elements: `backdrop-filter: blur(16px)`, semi-transparent backgrounds (e.g., `bg-white/40` in light mode, `bg-slate-900/40` in dark mode), subtle translucent borders, and soft shadows.
- Avoid flat, opaque surfaces for main cards and panels; use glass effects over a vibrant or dynamic background (such as an abstract gradient or a curated background color).
- Keep text readable and contrasts accessible despite the glass effect.

## Dark Mode
- Introduce Dark Mode as an option, applying the Glassmorphism theme with darker translucent surfaces and appropriate text colors.

## Motion & Micro-animations
- Add hover effects and interactive micro-animations to cards, buttons, and links to make the interface feel responsive and alive.
