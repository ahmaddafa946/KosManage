# DEVELOPMENT — KosManage

## Status of this phase

The v2.0.0 Tauri/React application implementation is present. Supabase remains the cloud data plane; Tauri is the thin desktop shell.

Commands below are the current application toolchain. Rust/Cargo remains required for the native Tauri build.

## Requirements (target stack)

| Tool | Purpose |
|------|---------|
| Node.js (LTS) | Frontend toolchain |
| npm | Package manager (AS-006) |
| Rust (stable) | Tauri backend |
| Tauri 2 prerequisites | Platform deps for Windows builds |
| Supabase CLI + project | Migrations, local DB, Auth |
| Git | Version control |

Windows 10/11 is the primary desktop target.

## Repository layout (current)

```text
/
├── *.md                 # SSOT documentation
├── .env.example
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── src/                 # React application
└── src-tauri/           # Tauri/Rust desktop shell
```

## Environment

Copy `.env.example` to `.env` (never commit `.env`):

```bash
cp .env.example .env
```

Variables:

| Name | Description |
|------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon key |

Never put `service_role` in the desktop app env.

## Database (available now)

With Supabase CLI linked/started:

```bash
supabase db reset
```

This applies `supabase/migrations/*` and runs `supabase/seed.sql` when configured in `config.toml` (to be added at bootstrap if missing).

Demo seed credentials (local):

- Email: `owner@kosmanage.dev`
- Password: `KosManage!dev1`

See comments in `supabase/seed.sql`.

## Installation

```bash
npm install
```

## Development

```bash
npm run tauri dev
```

Frontend-only Vite (if script provided):

```bash
npm run dev
```

## Testing (after app bootstrap)

```bash
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

## Build (after app bootstrap)

```bash
npm run build
npm run tauri build
```

## Coding workflow

1. Read relevant SSOT docs (`PRD`, `ARCHITECTURE`, `DATABASE`, `SECURITY`, `UI-UX`).
2. Prefer small, focused changes.
3. Schema changes → new migration + update `DATABASE.md`.
4. Before finishing a task: typecheck, test, build (once toolchain exists).

## Commit hygiene

- Commit migrations and lockfiles
- Do not commit `.env`, `node_modules`, `dist`, `target`, logs
- Prefer conventional messages: `feat:`, `fix:`, `docs:`, `chore:`

## Next implementation phase checklist

1. Initialize Tauri 2 + React + TS + Vite
2. Tailwind + shadcn/ui + Lucide
3. Wire Supabase client + Auth
4. Implement features: Dashboard → Rooms → Tenants → Payments → Reports
5. Add Vitest + RTL; cargo tests as needed
6. Windows production build verification

---

# v2.0 Dev Notes

- Toolchain: npm; typecheck `node ./node_modules/typescript/lib/tsc.js --noEmit` bila wrapper .bin rusak (CRLF/Windows symlink); vitest run; vite build. Tauri build butuh cargo (masih blocker host).
- Flow slice: implement → test → typecheck → build bila relevan → verify → update IMPLEMENTATION_STATUS → commit atomic lokal (no push tanpa instruksi).
- SSOT dulu sebelum code (fase ini); migration additive berurutan; backfill non-destruktif.
