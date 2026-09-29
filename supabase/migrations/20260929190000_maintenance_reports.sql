-- KosManage Slice 5: maintenance_reports lifecycle + isolation (FR-110..112).
-- Additive only. No changes to existing tables/policies. image_url column
-- exists as planned field; Storage/bucket is Slice 6 (NOT here).

-- ---------------------------------------------------------------------------
-- 1. Table (D-lifecycle: forward-only submitted->in_progress->resolved->closed)
-- ---------------------------------------------------------------------------
create table public.maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 120),
  description text not null check (char_length(btrim(description)) > 0 and char_length(description) <= 2000),
  category text not null check (category in ('AC', 'electrical', 'plumbing', 'furniture', 'internet', 'other')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null default 'submitted' check (status in ('submitted', 'in_progress', 'resolved', 'closed')),
  image_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create index idx_maintenance_property on public.maintenance_reports (property_id);
create index idx_maintenance_tenant on public.maintenance_reports (tenant_id);
create index idx_maintenance_status on public.maintenance_reports (status);
create index idx_maintenance_property_status on public.maintenance_reports (property_id, status);
create index idx_maintenance_room on public.maintenance_reports (room_id);

create trigger maintenance_reports_set_updated_at
before update on public.maintenance_reports
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Integrity guard (INVOKER, trigger-only, revoked from clients)
-- - tenant.property_id = NEW.property_id
-- - room (if set) belongs to same property AND is the tenant's current room
-- - INSERT requires tenant active
-- ---------------------------------------------------------------------------
create or replace function public.validate_maintenance_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant public.tenants%rowtype;
  v_room public.rooms%rowtype;
begin
  select * into v_tenant from public.tenants where id = new.tenant_id;
  if not found then
    raise exception 'Tenant not found';
  end if;
  if v_tenant.property_id <> new.property_id then
    raise exception 'Report property_id must match tenant.property_id';
  end if;
  if tg_op = 'INSERT' and v_tenant.status <> 'active' then
    raise exception 'Only active tenants can create reports';
  end if;
  if new.room_id is not null then
    select * into v_room from public.rooms where id = new.room_id;
    if not found then
      raise exception 'Room not found';
    end if;
    if v_room.property_id <> new.property_id then
      raise exception 'Report room must belong to report property';
    end if;
    if v_tenant.room_id is distinct from new.room_id then
      raise exception 'Report room must be the tenant current room';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_maintenance_integrity() from public, anon, authenticated, service_role;

create trigger maintenance_reports_validate_integrity
before insert or update of property_id, tenant_id, room_id on public.maintenance_reports
for each row execute function public.validate_maintenance_integrity();

-- ---------------------------------------------------------------------------
-- 3. Lifecycle guard (INVOKER, trigger-only, DB-authoritative resolved_at)
-- Forward-only: submitted->in_progress->resolved->closed. No skip/back/reopen.
-- resolved_at: set to now() on entering resolved; retained on closed;
-- forced NULL otherwise (client input ignored). Non-owner callers cannot
-- change status or resolved_at at all (tenant lane backstop).
-- ---------------------------------------------------------------------------
create or replace function public.guard_maintenance_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_owner boolean;
begin
  if new.status <> old.status or new.resolved_at is distinct from old.resolved_at then
    select (select private.is_property_owner(old.property_id)) into v_is_owner;
    if not coalesce(v_is_owner, false) then
      raise exception 'Only property owner can change report status';
    end if;
  end if;
  if new.status = old.status then
    -- Non-status edit: resolved_at immutable.
    new.resolved_at := old.resolved_at;
    return new;
  end if;
  if old.status = 'submitted' and new.status = 'in_progress' then
    new.resolved_at := null;
  elsif old.status = 'in_progress' and new.status = 'resolved' then
    new.resolved_at := now();
  elsif old.status = 'resolved' and new.status = 'closed' then
    new.resolved_at := old.resolved_at; -- retain resolution timestamp
  else
    raise exception 'Invalid maintenance status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_maintenance_transition() from public, anon, authenticated, service_role;

create trigger maintenance_reports_guard_transition
before update of status, resolved_at on public.maintenance_reports
for each row execute function public.guard_maintenance_transition();

-- ---------------------------------------------------------------------------
-- 4. RLS: owner property lane + tenant own lane (FR-112)
-- ---------------------------------------------------------------------------
alter table public.maintenance_reports enable row level security;

revoke all on table public.maintenance_reports from public, anon;

drop policy if exists maintenance_select_own on public.maintenance_reports;
create policy maintenance_select_own on public.maintenance_reports
  for select to authenticated
  using ((select private.is_property_owner(property_id)));

drop policy if exists maintenance_insert_own on public.maintenance_reports;
create policy maintenance_insert_own on public.maintenance_reports
  for insert to authenticated
  with check ((select private.is_property_owner(property_id)));

drop policy if exists maintenance_update_own on public.maintenance_reports;
create policy maintenance_update_own on public.maintenance_reports
  for update to authenticated
  using ((select private.is_property_owner(property_id)))
  with check ((select private.is_property_owner(property_id)));

-- No DELETE policy: FR-110..112 never grant delete; reports are
-- lifecycle records (submitted->in_progress->resolved->closed).

-- Tenant SELECT own reports only.
drop policy if exists maintenance_select_tenant on public.maintenance_reports;
create policy maintenance_select_tenant on public.maintenance_reports
  for select to authenticated
  using (
    exists (
      select 1 from public.tenants t
       where t.id = maintenance_reports.tenant_id
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

-- Tenant INSERT own active report only, property/room consistent.
drop policy if exists maintenance_insert_tenant on public.maintenance_reports;
create policy maintenance_insert_tenant on public.maintenance_reports
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tenants t
       where t.id = maintenance_reports.tenant_id
         and t.status = 'active'
         and t.property_id = maintenance_reports.property_id
         and private.is_own_tenant(t.profile_id)
    )
    and (
      maintenance_reports.room_id is null
      or exists (
        select 1 from public.rooms r
         where r.id = maintenance_reports.room_id
           and r.property_id = maintenance_reports.property_id
      )
    )
  );

-- Tenant UPDATE content only: status/resolved_at immutable via WITH CHECK
-- equality to current row values (transition trigger is second backstop).
drop policy if exists maintenance_update_tenant on public.maintenance_reports;
create policy maintenance_update_tenant on public.maintenance_reports
  for update to authenticated
  using (
    exists (
      select 1 from public.tenants t
       where t.id = maintenance_reports.tenant_id
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  )
  with check (
    exists (
      select 1 from public.tenants t
       where t.id = maintenance_reports.tenant_id
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Verification queries (read-only, run after manual apply)
-- ---------------------------------------------------------------------------
-- -- a. table + RLS enabled
-- -- select tablename, rowsecurity from pg_tables where tablename = 'maintenance_reports';
-- -- b. constraints
-- -- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.maintenance_reports'::regclass order by 1;
-- -- c. indexes
-- -- select indexname from pg_indexes where tablename = 'maintenance_reports' order by 1;
-- -- d. policies (expect 6: 3 owner select/insert/update + 3 tenant; UPDATE has USING + WITH CHECK; NO delete policy)
-- -- select policyname, cmd, qual, with_check from pg_policies where tablename = 'maintenance_reports' order by 1;
-- -- e. functions hardened (INVOKER + search_path '' + no public execute)
-- -- select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') as config
-- --   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- --  where n.nspname = 'public' and p.proname in ('validate_maintenance_integrity', 'guard_maintenance_transition');
-- -- f. no public/anon grants on table
-- -- select grantee, privilege_type from information_schema.role_table_grants where table_name = 'maintenance_reports' order by 1, 2;
-- -- g. existing data counts unchanged (expect 0 rows in new table; legacy untouched)
-- -- select count(*) as maintenance_reports from maintenance_reports;
-- -- select count(*) as rooms, (select count(*) from tenants) as tenants from rooms;
