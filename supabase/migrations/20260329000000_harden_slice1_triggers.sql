-- KosManage v2.0 Slice 1 hardening: lock down trigger-only functions.
-- Additive/idempotent. Does NOT edit v1 or prior Slice 1 migrations.
-- Live fact addressed: Security Advisor flags public.handle_new_user()
-- as SECURITY DEFINER with anon/authenticated EXECUTE=true.
-- Trigger firing does NOT require EXECUTE grants, so revoking them
-- blocks Data API/RPC calls while triggers keep working.

-- ---------------------------------------------------------------------------
-- 1. handle_new_user: keep DEFINER (bootstrap needs it), empty search_path,
-- role hardcoded 'owner'. No role from user metadata. Revoke all direct use.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'owner'
  )
  on conflict (id) do update set
    email = excluded.email;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
revoke all on function public.handle_new_user() from service_role;

-- ---------------------------------------------------------------------------
-- 2. guard_profile_role_change: trigger-only, INVOKER, empty search_path.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.role is distinct from new.role then
    if old.role = 'owner' and new.role = 'tenant' then
      return new;
    end if;
    raise exception 'Role change not allowed';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_profile_role_change() from public;
revoke all on function public.guard_profile_role_change() from anon;
revoke all on function public.guard_profile_role_change() from authenticated;
revoke all on function public.guard_profile_role_change() from service_role;

-- ---------------------------------------------------------------------------
-- 3. prevent_tenant_profile_relink: trigger-only, INVOKER, empty search_path.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_tenant_profile_relink()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.profile_id is distinct from new.profile_id
     and old.profile_id is not null and new.profile_id is not null then
    raise exception 'Tenant profile link cannot be changed once set';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_tenant_profile_relink() from public;
revoke all on function public.prevent_tenant_profile_relink() from anon;
revoke all on function public.prevent_tenant_profile_relink() from authenticated;
revoke all on function public.prevent_tenant_profile_relink() from service_role;

-- Legacy v1 functions (set_updated_at, compute_payment_status,
-- payments_set_status, sync_room_occupancy_from_tenant,
-- prevent_delete_occupied_room, validate_payment_relations):
-- search_path warnings recorded as backlog, out of Slice 1 scope.

-- Refresh PostgREST schema cache so revoked functions leave the Data API.
notify pgrst, 'reload schema';
