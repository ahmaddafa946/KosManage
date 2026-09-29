-- KosManage v2.0 Slice 1 corrective: move all owner RLS to private helper,
-- revoke + drop public.is_property_owner(uuid).
-- Additive/idempotent. Does NOT edit v1 or Slice 1 migrations.
-- Live facts addressed: public helper had anon EXECUTE=true + anon RPC 200;
-- 12 owner policies on rooms/tenants/payments called public helper.

-- ---------------------------------------------------------------------------
-- 1. Re-harden private helpers (idempotent; D5)
-- ---------------------------------------------------------------------------
create schema if not exists private;

create or replace function private.is_property_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.properties p
     where p.id = p_property_id
       and p.owner_id = auth.uid()
  );
$$;

revoke all on function private.is_property_owner(uuid) from public;
revoke all on function private.is_property_owner(uuid) from anon;
revoke all on function private.is_property_owner(uuid) from authenticated;
revoke all on function private.is_property_owner(uuid) from service_role;
grant execute on function private.is_property_owner(uuid) to authenticated;
grant execute on function private.is_property_owner(uuid) to service_role;

create or replace function private.is_own_tenant(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id is not null and p_profile_id = auth.uid();
$$;

revoke all on function private.is_own_tenant(uuid) from public;
revoke all on function private.is_own_tenant(uuid) from anon;
revoke all on function private.is_own_tenant(uuid) from authenticated;
revoke all on function private.is_own_tenant(uuid) from service_role;
grant execute on function private.is_own_tenant(uuid) to authenticated;
grant execute on function private.is_own_tenant(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. rooms: 4 owner policies -> private helper (semantics unchanged)
-- ---------------------------------------------------------------------------
drop policy if exists rooms_select_own on public.rooms;
create policy rooms_select_own on public.rooms
  for select to authenticated
  using ((select private.is_property_owner(property_id)));

drop policy if exists rooms_insert_own on public.rooms;
create policy rooms_insert_own on public.rooms
  for insert to authenticated
  with check ((select private.is_property_owner(property_id)));

drop policy if exists rooms_update_own on public.rooms;
create policy rooms_update_own on public.rooms
  for update to authenticated
  using ((select private.is_property_owner(property_id)))
  with check ((select private.is_property_owner(property_id)));

drop policy if exists rooms_delete_own on public.rooms;
create policy rooms_delete_own on public.rooms
  for delete to authenticated
  using ((select private.is_property_owner(property_id)));

-- ---------------------------------------------------------------------------
-- 3. tenants: 4 owner policies -> private helper (semantics unchanged)
-- tenant self-read policy tenants_select_own_link untouched.
-- ---------------------------------------------------------------------------
drop policy if exists tenants_select_own on public.tenants;
create policy tenants_select_own on public.tenants
  for select to authenticated
  using ((select private.is_property_owner(property_id)));

drop policy if exists tenants_insert_own on public.tenants;
create policy tenants_insert_own on public.tenants
  for insert to authenticated
  with check ((select private.is_property_owner(property_id)));

drop policy if exists tenants_update_own on public.tenants;
create policy tenants_update_own on public.tenants
  for update to authenticated
  using ((select private.is_property_owner(property_id)))
  with check ((select private.is_property_owner(property_id)));

drop policy if exists tenants_delete_own on public.tenants;
create policy tenants_delete_own on public.tenants
  for delete to authenticated
  using ((select private.is_property_owner(property_id)));

-- ---------------------------------------------------------------------------
-- 4. payments: 4 owner policies -> private helper (semantics unchanged)
-- tenant self-read policy payments_select_own_tenant untouched.
-- ---------------------------------------------------------------------------
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using ((select private.is_property_owner(property_id)));

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert to authenticated
  with check ((select private.is_property_owner(property_id)));

drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
  for update to authenticated
  using ((select private.is_property_owner(property_id)))
  with check ((select private.is_property_owner(property_id)));

drop policy if exists payments_delete_own on public.payments;
create policy payments_delete_own on public.payments
  for delete to authenticated
  using ((select private.is_property_owner(property_id)));

-- ---------------------------------------------------------------------------
-- 5. Remove public helper from Data API + drop (dependency now zero)
-- Dependency audit (source): 12 owner policies above were the only
-- callers of public.is_property_owner; Slice 1 wrapper delegated to
-- private. No new public wrapper is created. pg_depend check for live:
--   select * from pg_depend where refobjid =
--     'public.is_property_owner(uuid)'::regprocedure;
-- ---------------------------------------------------------------------------
revoke all on function public.is_property_owner(uuid) from public;
revoke all on function public.is_property_owner(uuid) from anon;
revoke all on function public.is_property_owner(uuid) from authenticated;
revoke all on function public.is_property_owner(uuid) from service_role;

drop function if exists public.is_property_owner(uuid);

-- Refresh PostgREST schema cache so dropped RPC disappears from Data API.
notify pgrst, 'reload schema';
