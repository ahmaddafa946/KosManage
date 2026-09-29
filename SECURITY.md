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
