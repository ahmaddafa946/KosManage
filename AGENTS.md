# AGENTS.md — KosManage

Instructions for AI coding agents working on this repository.

## General

- Read `PRD.md` before implementing product behavior.
- Read `ARCHITECTURE.md` before changing project structure or adding layers.
- Read `DATABASE.md` before changing schema; ship a versioned migration.
- Read `UI-UX.md` before changing visuals or copy.
- Read `SECURITY.md` before touching auth, RLS, or secrets.
- Read `ASSUMPTIONS.md` before expanding scope.
- Do not violate documented requirements without updating the SSOT docs in the same change.

## Priority when requirements conflict

1. Security  
2. Data integrity  
3. Core functionality  
4. Usability  
5. Performance  
6. Maintainability  
7. Visual polish  
8. Nice-to-have  

## Coding

- TypeScript strict mode; avoid `any`.
- Prefer reusable components; do not duplicate business logic across features.
- Keep files focused; avoid giant modules.
- Do not add dependencies without a documented reason.
- Use consistent naming (features, Zod schemas, Supabase types).
- UI copy in **Bahasa Indonesia**; code identifiers in English.
- Package manager is **npm** — do not switch lockfiles casually.

## Architecture boundaries

- React → Supabase for CRUD; do **not** invent an Axum/REST server without a real need documented in `ARCHITECTURE.md`.
- Do **not** replace Supabase with SQLite because it seems easier.
- Tauri/Rust is for native desktop concerns, not a second API for all data access in MVP.
- Database is source of truth for payment status and occupancy rules.

## Supabase

- Keep RLS enabled; never disable RLS to fix client errors.
- Never put `service_role` keys in the desktop client or commit them.
- All schema changes via `supabase/migrations/`.
- Update `DATABASE.md` and `SECURITY.md` when policies/tables change.
- Seed data must remain dummy PII only.

## UI

- Follow `UI-UX.md` palette, Inter font, layout, empty/loading/error patterns.
- Keep UI minimal and calm; no decorative chart libraries for vanity.
- Ensure keyboard focus, labels, and aria-labels on icon-only controls.
- Respect sidebar collapse and small-window behavior.

## Testing and quality gate

Before completing a task (once the app toolchain exists):

```text
typecheck
test
build
```

If any fail, fix before claiming done.

For SQL-only changes: verify migration applies cleanly and critical constraints/RLS still hold (`TESTING.md`).

## Git hygiene

- Do not commit `.env`, secrets, `node_modules`, `dist`, `target`, logs.
- Prefer clear commits: `feat:`, `fix:`, `docs:`, `chore:`.
- Do not expand into future-scope features (WhatsApp, gateway, multi-staff, etc.) while MVP is unstable.

## Prototype standard

Simple is good. Weak foundations are not. Prefer a small correct MVP over a large fragile demo.
