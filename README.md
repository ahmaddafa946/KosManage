# KosManage

Modern desktop application for small-to-medium boarding house (kos) management.

> **Phase status:** Documentation + Supabase schema foundation complete. Tauri/React application bootstrap is **not** started yet. See [DEVELOPMENT.md](DEVELOPMENT.md).

<!-- Screenshot placeholder: add app screenshot after UI bootstrap -->

## Features (MVP)

- Authentication (email/password via Supabase Auth)
- Dashboard (occupancy, income, arrears)
- Room management
- Tenant management
- Payment tracking with computed statuses
- Simple occupancy & revenue reports

## Architecture overview

```text
React + TypeScript  ↔  Tauri (Rust)  ↔  Supabase (Auth + PostgreSQL + RLS)
```

Details: [ARCHITECTURE.md](ARCHITECTURE.md)

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2 |
| Frontend | React, TypeScript, Vite |
| Styling / UI | Tailwind CSS, shadcn/ui, Lucide |
| Backend data | Supabase PostgreSQL + Auth |
| Validation | Zod (client); SQL constraints/triggers (server) |
| Package manager | npm |

## Requirements

- Node.js LTS, npm
- Rust + Tauri Windows prerequisites (for app bootstrap)
- Supabase project / CLI (for migrations & seed)
- Git

## Documentation (SSOT)

| Document | Purpose |
|----------|---------|
| [PRD.md](PRD.md) | Product requirements (ID) |
| [REQUIREMENTS.md](REQUIREMENTS.md) | FR / NFR / SEC IDs |
| [ASSUMPTIONS.md](ASSUMPTIONS.md) | MVP assumptions (ID) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [DATABASE.md](DATABASE.md) | Schema & integrity |
| [API.md](API.md) | Data operations catalog |
| [UI-UX.md](UI-UX.md) | Visual & UX (ID) |
| [SECURITY.md](SECURITY.md) | Auth, RLS, secrets |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Setup & workflow |
| [TESTING.md](TESTING.md) | Test strategy |
| [AGENTS.md](AGENTS.md) | Rules for AI coding agents |

## Setup

1. Clone the repository.
2. Copy environment file:

```bash
cp .env.example .env
```

3. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (never commit real secrets).
4. Apply database migrations (Supabase CLI), e.g. `supabase db reset` when configured.
5. **After app bootstrap:** `npm install` then `npm run tauri dev`.

### Demo seed (local)

- Email: `owner@kosmanage.dev`
- Password: `KosManage!dev1`

See [supabase/seed.sql](supabase/seed.sql).

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | Publishable anon key |

Do **not** use the service-role key in the desktop client.

## Development / testing / build

Documented in [DEVELOPMENT.md](DEVELOPMENT.md). App scripts become available after Tauri/React bootstrap.

## Project structure

```text
/
├── README.md, PRD.md, REQUIREMENTS.md, ...
├── supabase/
│   ├── migrations/     # versioned SQL
│   └── seed.sql
├── src/                # React app (bootstrap pending)
└── src-tauri/          # Tauri/Rust (bootstrap pending)
```

## Database

PostgreSQL tables: `profiles`, `properties`, `rooms`, `tenants`, `payments`.

Ownership-based RLS, occupancy triggers, and payment status computation are defined in:

- [DATABASE.md](DATABASE.md)
- [supabase/migrations/20260326000000_init_kosmanage.sql](supabase/migrations/20260326000000_init_kosmanage.sql)

## Contributing

1. Keep SSOT docs consistent with code and migrations.
2. Follow [AGENTS.md](AGENTS.md) and [SECURITY.md](SECURITY.md).
3. Prefer small PRs focused on one module.
4. Do not expand into future-scope features while MVP is incomplete.

## License

To be determined by the repository owner.

---

# v2.0 — Implemented

Owner & Tenant expansion: role-based auth, master facilities + checkbox, rental countdown Asia/Jakarta, maintenance reports + private photo Storage, payment additive (QRIS/reference/URL/paid_at, simulasi berlabel), tenant dashboards/profile, dan pemisahan Laporan vs Laporan Keuangan. Baseline produk v1.0; expansion ini menjadi v2.0. Tanpa Liquid Glass redesign.
