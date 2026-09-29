-- KosManage Slice 3: facilities master + room_facilities M2M + legacy backfill
-- Migration: 20260330000000_facilities_master
-- Additive only. No DROP TABLE/COLUMN. No DML on existing rows except
-- INSERT of new master/link rows derived from legacy rooms.facilities.
-- Legacy rooms.facilities column PRESERVED (deprecated read-only, D4/FR-093).

-- ---------------------------------------------------------------------------
-- 1. facilities master per property (FR-090)
-- ---------------------------------------------------------------------------
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0 and char_length(name) <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Name unique per property, case-insensitive.
create unique index uq_facilities_property_lower_name
  on public.facilities (property_id, (lower(btrim(name))));

create index idx_facilities_property on public.facilities (property_id);
create index idx_facilities_property_active on public.facilities (property_id) where is_active;

create trigger facilities_set_updated_at
before update on public.facilities
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. room_facilities M2M (FR-091)
-- CASCADE on room delete; RESTRICT on facility delete (inactive instead).
-- ---------------------------------------------------------------------------
create table public.room_facilities (
  room_id uuid not null references public.rooms (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (room_id, facility_id)
);

create index idx_room_facilities_facility on public.room_facilities (facility_id);
create index idx_room_facilities_room on public.room_facilities (room_id);

-- ---------------------------------------------------------------------------
-- 3. Legacy backfill: rooms.facilities (comma text) -> master + links (FR-093)
-- Non-destructive: INSERT only. Legacy column untouched. Function dropped
-- after use so no new permanent helper remains.
-- ---------------------------------------------------------------------------
create or replace function public.backfill_room_facilities_once()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  fname text;
  v_facility_id uuid;
begin
  for r in select id, property_id, facilities from public.rooms where facilities is not null and btrim(facilities) <> '' loop
    foreach fname in array string_to_array(r.facilities, ',') loop
      fname := btrim(fname);
      if fname = '' or char_length(fname) > 100 then continue; end if;
      insert into public.facilities (property_id, name)
      values (r.property_id, fname)
      on conflict (property_id, (lower(btrim(name)))) do nothing;
      select id into v_facility_id from public.facilities
        where property_id = r.property_id and lower(btrim(name)) = lower(btrim(fname));
      if v_facility_id is not null then
        insert into public.room_facilities (room_id, facility_id)
        values (r.id, v_facility_id)
        on conflict do nothing;
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.backfill_room_facilities_once() from public;

select public.backfill_room_facilities_once();

drop function public.backfill_room_facilities_once();

-- ---------------------------------------------------------------------------
-- 4. RLS: facilities (owner-only mutation, tenant read-own)
-- ---------------------------------------------------------------------------
alter table public.facilities enable row level security;

revoke all on table public.facilities from public, anon;

drop policy if exists facilities_select_own on public.facilities;
create policy facilities_select_own on public.facilities
  for select to authenticated
  using ((select private.is_property_owner(property_id)));

drop policy if exists facilities_insert_own on public.facilities;
create policy facilities_insert_own on public.facilities
  for insert to authenticated
  with check ((select private.is_property_owner(property_id)));

drop policy if exists facilities_update_own on public.facilities;
create policy facilities_update_own on public.facilities
  for update to authenticated
  using ((select private.is_property_owner(property_id)))
  with check ((select private.is_property_owner(property_id)));

drop policy if exists facilities_delete_own on public.facilities;
create policy facilities_delete_own on public.facilities
  for delete to authenticated
  using ((select private.is_property_owner(property_id)));

-- Tenant read: only facilities linked to their own room.
drop policy if exists facilities_select_tenant on public.facilities;
create policy facilities_select_tenant on public.facilities
  for select to authenticated
  using (
    exists (
      select 1
        from public.room_facilities rf
        join public.rooms r on r.id = rf.room_id
        join public.tenants t on t.room_id = r.id
       where rf.facility_id = facilities.id
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RLS: room_facilities (cross-property guard)
-- INSERT/WITH CHECK explicitly requires r.property_id = f.property_id
-- in addition to owner check on the room side. Property A room +
-- Property B facility -> DENY. Same property -> ALLOW.
-- ---------------------------------------------------------------------------
alter table public.room_facilities enable row level security;

revoke all on table public.room_facilities from public, anon;

drop policy if exists room_facilities_select_own on public.room_facilities;
create policy room_facilities_select_own on public.room_facilities
  for select to authenticated
  using (
    exists (
      select 1 from public.rooms r
       where r.id = room_facilities.room_id
         and (select private.is_property_owner(r.property_id))
    )
  );

drop policy if exists room_facilities_insert_own on public.room_facilities;
create policy room_facilities_insert_own on public.room_facilities
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.rooms r
        join public.facilities f on f.id = room_facilities.facility_id
       where r.id = room_facilities.room_id
         and r.property_id = f.property_id
         and (select private.is_property_owner(r.property_id))
    )
  );

drop policy if exists room_facilities_update_own on public.room_facilities;
create policy room_facilities_update_own on public.room_facilities
  for update to authenticated
  using (
    exists (
      select 1 from public.rooms r
       where r.id = room_facilities.room_id
         and (select private.is_property_owner(r.property_id))
    )
  )
  with check (
    exists (
      select 1
        from public.rooms r
        join public.facilities f on f.id = room_facilities.facility_id
       where r.id = room_facilities.room_id
         and r.property_id = f.property_id
         and (select private.is_property_owner(r.property_id))
    )
  );

drop policy if exists room_facilities_delete_own on public.room_facilities;
create policy room_facilities_delete_own on public.room_facilities
  for delete to authenticated
  using (
    exists (
      select 1 from public.rooms r
       where r.id = room_facilities.room_id
         and (select private.is_property_owner(r.property_id))
    )
  );

-- Tenant read: only links of their own active room.
drop policy if exists room_facilities_select_tenant on public.room_facilities;
create policy room_facilities_select_tenant on public.room_facilities
  for select to authenticated
  using (
    exists (
      select 1
        from public.rooms r
        join public.tenants t on t.room_id = r.id
       where r.id = room_facilities.room_id
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Cross-property verification (read-only, no DML on existing data)
-- Run after apply with owner session. Expected:
-- same-property link ALLOWED (no RLS violation), cross-property DENIED.
-- ---------------------------------------------------------------------------
-- -- SAME property (expect 1 row: owner check passes, r.property_id = f.property_id)
-- -- select r.id, f.id from rooms r, facilities f
-- --  where r.property_id = f.property_id limit 1;  -- candidate pair
-- -- CROSS property (expect 0 rows under RLS WITH CHECK on insert attempt;
-- -- verify denial, then roll back the test insert)
-- -- begin;
-- -- insert into room_facilities (room_id, facility_id)
-- -- values ('<room-of-property-A>', '<facility-of-property-B>');  -- must fail (42501 / RLS)
-- -- rollback;
