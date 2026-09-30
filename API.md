# API — KosManage

Data access is via the **Supabase JS client** from the React app (not a custom REST/Axum server). This document catalogs operations the application must support.

All mutations are subject to RLS ownership. Payment `status` is computed in the database.

## Conventions

| Item | Convention |
|------|------------|
| Scope | Always filter by current user’s property (`property_id`) |
| Errors | Map PostgREST / auth errors to Indonesian UI messages |
| Validation | Zod on client; DB constraints authoritative |
| IDs | UUID strings |

---

## AUTH

| Operation | Description | Client API (conceptual) |
|-----------|-------------|-------------------------|
| `signIn` | Email + password login | `supabase.auth.signInWithPassword({ email, password })` |
| `signUp` | Optional for MVP demo; production may invite-only | `supabase.auth.signUp(...)` |
| `signOut` | End session | `supabase.auth.signOut()` |
| `getCurrentUser` | Current auth user | `supabase.auth.getUser()` / `getSession()` |
| `onAuthStateChange` | Session subscription | `supabase.auth.onAuthStateChange(...)` |

---

## PROPERTIES

| Operation | Description |
|-----------|-------------|
| `getPrimaryProperty` | Fetch first/only property for `owner_id = auth.uid()` |
| `createProperty` | Insert property (`owner_id` must equal `auth.uid()`) |
| `updateProperty` | Update name/address |

MVP UI assumes one primary property (AS-001).

---

## ROOMS

| Operation | Description |
|-----------|-------------|
| `getRooms` | List by `property_id`; supports search (`room_number`), filter (`status`), sort |
| `getRoom` | Single room by `id` (+ optional active tenant join) |
| `createRoom` | Insert room; default status `available` |
| `updateRoom` | Update fields; respect occupancy/maintenance rules |
| `deleteRoom` | Delete if no active tenant (DB trigger enforces) |

Example filter params: `status`, `q` (room_number ilike), `orderBy`, `ascending`.

---

## TENANTS

| Operation | Description |
|-----------|-------------|
| `getTenants` | List by property; search name/phone; filter status |
| `getTenant` | Detail + payment history |
| `createTenant` | Active tenant on available room → room becomes occupied |
| `updateTenant` | Profile updates; room move; deactivate |
| `deactivateTenant` | Set `status = inactive`, optional `end_date` |
| `deleteTenant` | Prefer deactivate; hard delete only if no payment FK conflict |

---

## PAYMENTS

| Operation | Description |
|-----------|-------------|
| `getPayments` | List with filters: month (`billing_period`), status, method; sort; pagination |
| `getPayment` | Single payment |
| `createPayment` | Insert; DB sets `status`; auto-fills `room_id` from tenant if omitted |
| `updatePayment` | Update amounts/dates/method; DB recomputes `status` |
| `deletePayment` | Delete with confirmation (Should-have) |

Do **not** send authoritative `status` from the client; ignore or omit and let trigger set it.

---

## DASHBOARD

| Operation | Description |
|-----------|-------------|
| `getDashboardSummary` | Aggregates: total/occupied/available/maintenance rooms; active tenants; income this month; total outstanding |
| `getRecentPayments` | Latest N payments (e.g. 5–10) with tenant/room labels |
| `getOutstandingPayments` | `status in ('unpaid','partial','overdue')` |
| `getUpcomingPayments` | Unpaid/partial near `due_date` (e.g. next 14 days) plus overdue for action list |
| `getOutstandingPayments` (v2.0) | Sorted overdue first, then earliest `due_date`; UI label `Pembayaran Perlu Ditindaklanjuti`; remaining = max(0, due - paid) display only |
| `getMaintenanceDashboard` | `maintenance_reports` status submitted/in_progress: activeTotal, inProgress (only `in_progress`), recent 5 with room/tenant label; RLS owner |
| `getUpcomingRentalExpiries` | Active tenants with `end_date` 0..30 Jakarta calendar days (via `src/lib/rental.ts`); past_due + open-ended excluded; never persisted |
| `getMyTenantOccupancy` (v2.0) | Tenant self-read (`profile_id = auth.uid()`) + room join for tenant dashboard; read-only |

Prefer few aggregated queries over many row fetches.

---

## REPORTS

| Operation | Description |
|-----------|-------------|
| `getOccupancyReport` | Counts + occupancy rate for property |
| `getRevenueReport` | For period filter: total due, total paid, outstanding, income |
| `getPaymentReport` | Optional breakdown by status within period |

Period filters: `this_month` | `last_month` | `last_3_months` | `last_6_months` (map to `billing_period` or date ranges).

---

## Error codes (guidance)

| Situation | User message (ID) |
|-----------|-------------------|
| Invalid login | Email atau password salah. |
| RLS / not found | Data tidak ditemukan atau tidak dapat diakses. |
| Duplicate room number | Nomor kamar sudah digunakan. |
| Double occupancy | Kamar sudah ditempati penghuni aktif. |
| Maintenance assign | Kamar sedang maintenance. |
| Delete occupied room | Kamar masih memiliki penghuni aktif. |
| Network | Gagal terhubung. Periksa koneksi Anda. |
| Generic save failure | Gagal menyimpan. Silakan coba lagi. |

Technical details → developer console/logs only.

## Non-goals

- Custom HTTP resource server
- GraphQL
- Exposing service-role endpoints from the desktop app

---

# v2.0 Operations Delta

## IDENTITY
- getMyProfile / updateMyProfile (guarded: name/phone/email bila allowed; block role/ids)
- getMyTenant (by profile_id), owner getTenants tetap.

## FACILITIES
- getFacilities(propertyId, includeInactive=false) / createFacility / setFacilityActive / getRoomFacilities / setRoomFacilities(roomId, facilityIds[]) — owner only.

## RENTAL
- getMyRental (tenant: room, start/end, daysRemaining computed client Asia/Jakarta) / owner getRentalPeriods (upcoming expiry list).

## MAINTENANCE
- tenant createReport(title/desc/category/priority) → uploadReportPhoto(reportId, file) → updateReportImage; getMyReports; owner getReports(propertyId, filters) / updateReportStatus (guarded transitions) / resolveReport / closeReport.

## PAYMENTS v2
- tenant getMyBills / getMyHistory / startSimulatedPayment (labeled SIMULASI); owner getPayments/getArrears tetap + qris filter.
- Error ID tambahan: Fasilitas sudah ada. / Transisi status laporan tidak valid. / Pembayaran simulasi — bukan transaksi gateway nyata. / File terlalu besar / tipe tidak didukung.

## STORAGE
- getReportSignedUrl(reportId) — signed URL private; upload path {property_id}/{tenant_id}/{report_id}/{filename}.

## Rental utility (Slice 4, client-local)
- getJakartaDateKey/calculateDaysRemaining/getRentalBucket/getRentalStatus/formatDaysRemaining in src/lib/rental.ts. Pure, no network.

## Maintenance (Slice 5, no storage yet)
- getMaintenanceReports(propertyId, filters) owner; getMyMaintenanceReports tenant; createMaintenanceReport(ctx, input); updateMaintenanceReport (owner); updateMyMaintenanceReport (tenant content-only). No delete: FR-110..112 never grant it.
- Lifecycle: forward-only via isAllowedTransition; resolved_at DB-authoritative, never client-set.

## Maintenance photos (Slice 6, two-step D9)
- uploadMaintenanceReportPhoto(reportId, file): validate -> read report -> upload upsert:false -> attach PATH.
- attachMaintenanceReportPhoto(reportId, objectPath): image_url only. getMaintenanceReportPhotoUrl(path, ttl=3600s).
- Upload failure never touches image_url.
