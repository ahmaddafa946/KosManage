# SECURITY — KosManage

## Goals

- Authenticated owners only access their own operational data
- Database enforces authorization (RLS) and integrity
- No secrets in source control or desktop client beyond publishable keys
- Friendly errors for users; detailed logs for developers

## Authentication

| Topic | Decision |
|-------|----------|
| Provider | Supabase Auth |
| MVP method | Email + password |
| Password storage | Supabase only (never custom local password DB) |
| Session | Supabase client session persistence in the desktop webview |
| Logout | `signOut()` clears session; UI returns to login |
| Expired session | Treat as unauthenticated; redirect to login |

Related: FR-001–004, SEC-001.

## Authorization model

Ownership chain:

```text
auth.uid()
  → profiles.id
  → properties.owner_id
  → rooms / tenants / payments via property_id
```

**Do not** authorize only with `TO authenticated` without an ownership predicate.

**Do not** use editable user metadata as the source of authorization.

### RLS policy matrix

#### profiles

| Op | USING | WITH CHECK |
|----|-------|------------|
| SELECT | `id = auth.uid()` | — |
| INSERT | — | `id = auth.uid()` |
| UPDATE | `id = auth.uid()` | `id = auth.uid()` |
| DELETE | deny (or owner self only if ever needed) | — |

Profile rows are primarily created by the `auth.users` trigger.

#### properties

| Op | USING | WITH CHECK |
|----|-------|------------|
| SELECT | `owner_id = auth.uid()` | — |
| INSERT | — | `owner_id = auth.uid()` |
| UPDATE | `owner_id = auth.uid()` | `owner_id = auth.uid()` |
| DELETE | `owner_id = auth.uid()` | — |

UPDATE must not allow changing `owner_id` to another user (`WITH CHECK` enforces).

#### rooms / tenants / payments

| Op | Predicate concept |
|----|-------------------|
| SELECT | row’s `property_id` owned by `auth.uid()` |
| INSERT | `WITH CHECK` property owned by `auth.uid()` |
| UPDATE | `USING` + `WITH CHECK` same ownership (prevent move to foreign property) |
| DELETE | `USING` ownership |

Implementation uses `public.is_property_owner(property_id)` or equivalent `EXISTS` subquery on `properties`.

For `tenants` and `payments`, also ensure related `room_id` / `tenant_id` belong to the same property (app validation + FK). RLS on parent property is the primary gate.

## Secrets management

| Allowed in client | Never in client / Git |
|-------------------|------------------------|
| `VITE_SUPABASE_URL` | `service_role` key |
| `VITE_SUPABASE_ANON_KEY` | DB password |
| | any personal access tokens |

Files:

- `.env` / `.env.local` — gitignored
- `.env.example` — names only, empty or placeholder values

## Input security

- Zod validation before mutate calls
- DB CHECK constraints and triggers as backstop
- Use Supabase client parameterized APIs (no string-concat SQL in the app)
- Sanitize/normalize display strings where needed; treat all tenant-entered text as untrusted for rendering context

## Data protection

- RLS on all exposed tables
- Least privilege: anon key + user JWT only
- No sensitive payloads in application logs (tokens, identity numbers in verbose logs)
- Payments and identity fields visible only to owning user via RLS

## Local / desktop application security

- Tauri CSP and capability allowlists tightened during bootstrap (implementation phase)
- Minimum OS permissions
- Do not enable dangerous shell open APIs without need
- Window content loads local frontend assets; remote only to Supabase endpoints

## API / database access

- All MVP data access: React → Supabase JS client
- Rust does not hold service-role keys for CRUD
- No public tables without RLS

## Threat notes (MVP)

| Threat | Mitigation |
|--------|------------|
| Cross-owner data read/write | RLS ownership |
| Client tampers payment status | Trigger overwrites status |
| Double booking room | Partial unique + trigger |
| Secret leak via Git | gitignore + example env |
| XSS via notes fields | React text escaping; avoid `dangerouslySetInnerHTML` |

## Related requirements

SEC-001 … SEC-008 in `REQUIREMENTS.md`. Schema details in `DATABASE.md`. Agent rules in `AGENTS.md`.

---

# v2.0 Security Delta (D1/D5/D6 binding)

- profiles.email display copy only; auth source = auth.users.email; tidak untuk authorization; user_metadata tidak untuk authorization.
- Helper: private.is_property_owner hardened — SECURITY DEFINER minimal, SET search_path='', qualify semua relasi, revoke PUBLIC, grant authenticated, verify auth.uid() not null, tidak expose via Data API; pakai (select private.is_property_owner(...)) di policies.
- Tenant isolation: tenants.profile_id = auth.uid() chain untuk tenants/payments/maintenance_reports own; owner isolation via property.
- maintenance_reports UPDATE USING+WITH CHECK; tenant block set resolved/closed (policy + trigger check).
- Storage: bucket maintenance-reports PRIVATE; Storage RLS tenant-own vs owner-property; path первым segmen property_id; signed URL display; validasi MIME/size/ownership di client+policy; tanpa service_role di client; tanpa secret hardcoded.
- PII: identity_number/payment fields hanya via RLS owner/own.

## Payments (Slice 7, FR-120..122)
- Tenant: SELECT own only (payments_select_tenant_history, incl. history, no active gate); NO tenant INSERT/UPDATE/DELETE — mencegah tenant paksa amount_paid=amount_due.
- Simulated completion hanya via RPC start_simulated_payment (SECURITY DEFINER, search_path='', input payment_id+method only, ownership profile_id=auth.uid(), amount DB-authoritative full-pay, idempotent, EXECUTE authenticated-only, revoke anon/public).
- payment_url=NULL selama simulasi (tanpa fake gateway URL); payment_reference display-only SIMULASI-<id8>; paid_at set DB.
- Real gateway OUT OF SCOPE; tanpa service_role di client; tanpa user_metadata authorization.

## Maintenance reports (Slice 5, FR-112)
- Owner lane: 4 policies via private.is_property_owner(property_id); UPDATE USING + WITH CHECK.
- Tenant lane: select/insert/update own active tenant chain (tenants.profile_id = auth.uid()); tenant cannot set resolved/closed (RLS scope + trigger non-owner backstop).
- Triggers INVOKER + search_path='' + revoke all incl. service_role. No Storage in Slice 5.
- Least-privilege grants (corrective 20260929190100): authenticated = SELECT/INSERT/UPDATE only; DELETE/TRUNCATE/REFERENCES/TRIGGER revoked; PUBLIC/anon denied.

## Maintenance photo storage (Slice 6)
- Private bucket; Storage RLS: tenant insert/select own chain, owner select owned-property; no delete/update/all policies.
- Client MIME/size/filename validation (single source src/lib/maintenancePhoto.ts); bucket + RLS authoritative.
- Signed URL 1h display-only, never persisted. No service_role in client. No public access.
