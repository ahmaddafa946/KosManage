-- Slice 5 corrective: least-privilege table grants on maintenance_reports.
-- Live review found authenticated holding DELETE/TRUNCATE/REFERENCES/TRIGGER.
-- There is intentionally NO delete RLS policy (FR-110..112 never grant it),
-- so those privileges must not remain on the application role.
-- Additive/hardening only: no schema/policy/trigger/data change.

-- Explicit least privilege for the application role.
revoke delete, truncate, references, trigger
  on table public.maintenance_reports
  from authenticated;

-- Belt-and-suspenders: PUBLIC/anon stay denied (already revoked in Slice 5).
revoke all
  on table public.maintenance_reports
  from public, anon;

-- Required DML stays available to authenticated (RLS policies enforce scope):
-- SELECT via maintenance_select_own / maintenance_select_tenant,
-- INSERT via maintenance_insert_own / maintenance_insert_tenant,
-- UPDATE via maintenance_update_own / maintenance_update_tenant.

-- ---------------------------------------------------------------------------
-- Verification (read-only, run after manual apply)
-- ---------------------------------------------------------------------------
-- -- a. authenticated grants: expect SELECT/INSERT/UPDATE yes; DELETE/TRUNCATE/REFERENCES/TRIGGER absent
-- -- select privilege_type from information_schema.role_table_grants
-- --  where table_name = 'maintenance_reports' and grantee = 'authenticated' order by 1;
-- -- b. RLS still enabled
-- -- select tablename, rowsecurity from pg_tables where tablename = 'maintenance_reports';
-- -- c. policies unchanged (expect 6, no delete)
-- -- select policyname, cmd from pg_policies where tablename = 'maintenance_reports' order by 1;
-- -- d. triggers unchanged (updated_at + integrity + transition)
-- -- select tgname from pg_trigger where tgrelid = 'public.maintenance_reports'::regclass and not tgisinternal order by 1;
