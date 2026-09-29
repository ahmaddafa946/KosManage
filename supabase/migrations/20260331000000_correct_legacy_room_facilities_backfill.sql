-- KosManage Slice 3 corrective: legacy delimiter was '+' not ','.
-- First backfill (20260330000000) split only on ',' so a legacy value like
-- 'AC + Kasur + Lemari + Listrik + Wifi' became ONE combined master row.
-- Mixed legacy like 'AC + Kasur, Lemari + Wifi' became partial artifacts
-- ('AC + Kasur', 'Lemari + Wifi') because the first backfill split on ','
-- only. This migration re-parses legacy rooms.facilities on BOTH '+' and
-- ',', creates the proper masters + links, then removes backfill artifacts.
-- DO NOT edit the already-applied 20260330000000 migration.
-- Additive + scoped artifact cleanup only. Legacy rooms.facilities UNTOUCHED.

-- ---------------------------------------------------------------------------
-- 1. Correct parse (both separators) + create masters/links (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.correct_room_facilities_backfill_once()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_norm text;
  fname text;
  v_facility_id uuid;
begin
  for r in select id, property_id, facilities from public.rooms where facilities is not null and btrim(facilities) <> '' loop
    -- Normalize: treat '+' as separator too, then split on ','.
    v_norm := replace(r.facilities, '+', ',');
    foreach fname in array string_to_array(v_norm, ',') loop
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

revoke all on function public.correct_room_facilities_backfill_once() from public;

select public.correct_room_facilities_backfill_once();

drop function public.correct_room_facilities_backfill_once();

-- ---------------------------------------------------------------------------
-- 2. Artifact cleanup via captured IDs (full AND partial combined names).
-- The first migration split legacy on ',' only, so every leftover combined
-- piece still contains '+' (comma was consumed as the split char).
-- Artifact capture mirrors that parser: for each room whose legacy string
-- contains a separator, take its COMMA-tokens; a token that still contains
-- '+' and matches a linked facility (same property, case-insensitive) is a
-- first-backfill artifact. IDs are captured into a TEMP table BEFORE any
-- link is deleted. Deletes then target ONLY captured (room_id,
-- facility_id) pairs, and masters ONLY when orphaned (no links left
-- anywhere). No global DELETE on names that merely contain a separator.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_room_facilities_artifacts_once()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  tok text;
  v_facility_id uuid;
begin
  create temp table artifact_cleanup_ids (
    room_id uuid not null,
    facility_id uuid not null,
    primary key (room_id, facility_id)
  ) on commit drop;

  for r in select id, property_id, facilities from public.rooms where facilities is not null and btrim(facilities) <> '' and (facilities like '%+%' or facilities like '%,%') loop
    foreach tok in array string_to_array(r.facilities, ',') loop
      tok := btrim(tok);
      if tok = '' or char_length(tok) > 100 then continue; end if;
      if tok not like '%+%' then continue; end if; -- single name: not an artifact
      select id into v_facility_id from public.facilities
        where property_id = r.property_id and lower(btrim(name)) = lower(tok);
      if v_facility_id is not null
        and exists (select 1 from public.room_facilities rf where rf.room_id = r.id and rf.facility_id = v_facility_id)
      then
        insert into artifact_cleanup_ids (room_id, facility_id)
        values (r.id, v_facility_id)
        on conflict do nothing;
      end if;
    end loop;
  end loop;

  -- Delete ONLY captured wrong links.
  delete from public.room_facilities rf
  using artifact_cleanup_ids a
  where rf.room_id = a.room_id and rf.facility_id = a.facility_id;

  -- Delete captured masters ONLY when orphaned (RESTRICT-safe by construction).
  delete from public.facilities f
  using artifact_cleanup_ids a
  where f.id = a.facility_id
    and not exists (select 1 from public.room_facilities rf where rf.facility_id = f.id);

  drop table artifact_cleanup_ids;
end;
$$;

revoke all on function public.cleanup_room_facilities_artifacts_once() from public;

select public.cleanup_room_facilities_artifacts_once();

drop function public.cleanup_room_facilities_artifacts_once();

-- ---------------------------------------------------------------------------
-- 3. Verification queries (read-only, run after apply)
-- ---------------------------------------------------------------------------
-- -- a. counts per property
-- -- select property_id, count(*) as facilities from facilities group by 1 order by 1;
-- -- select count(*) as room_facility_links from room_facilities;
-- -- b. facility names per room (expect AC/Kasur/Lemari/Listrik/Wifi x5 links)
-- -- select r.room_number, f.name
-- --   from room_facilities rf
-- --   join rooms r on r.id = rf.room_id
-- --   join facilities f on f.id = rf.facility_id
-- --  order by r.room_number, f.name;
-- -- c. no case-insensitive duplicates inside a property (expect 0 rows)
-- -- select property_id, lower(btrim(name)) as n, count(*)
-- --   from facilities group by 1, 2 having count(*) > 1;
-- -- d. no combined-name artifacts left (expect 0 rows)
-- -- select id, property_id, name from facilities
-- --  where name like '%+%' or name like '%,%';
-- -- e. no first-backfill artifacts still LINKED (expect 0 rows):
-- --    linked facility whose name still contains a separator
-- -- select r.room_number, r.facilities as legacy, f.name as leftover_artifact
-- --   from room_facilities rf
-- --   join rooms r on r.id = rf.room_id
-- --   join facilities f on f.id = rf.facility_id
-- --  where f.name like '%+%' or f.name like '%,%';
-- -- f. mixed-delimiter room check (CASE B): legacy 'AC + Kasur, Lemari + Wifi'
-- --    must yield exactly AC/Kasur/Lemari/Wifi, no combined names
-- -- select r.room_number, f.name
-- --   from room_facilities rf
-- --   join rooms r on r.id = rf.room_id
-- --   join facilities f on f.id = rf.facility_id
-- --  where r.facilities like '%+,%' or r.facilities like '%,%+%'
-- --  order by r.room_number, f.name;
-- -- g. legacy column preserved (values still present, untouched)
-- -- select id, room_number, facilities as legacy_facilities from rooms
-- --  where facilities is not null;
