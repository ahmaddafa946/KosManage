-- KosManage v2.0 Slice 1: identity + role foundation
-- Additive only. Does not modify 20260326000000_init_kosmanage.sql.
-- Decisions: D1 (profiles.email display copy), D2 (tenants.profile_id),
-- D5 (private.is_property_owner hardened, public wrapper kept for compat).

-- ---------------------------------------------------------------------------
-- 1. profiles: role / email / phone
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'owner',
  add column if not exists email text,
  add column if not exists phone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('owner', 'tenant'));
  end if;
end
$$;

-- Backfill email from auth.users where accessible (best effort, nullable on failure)
do $$
begin
  update public.profiles p
     set email = u.email
    from auth.users u
   where u.id = p.id and p.email is null;
exception when others then
  raise notice 'profiles email backfill skipped: %', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. tenants.profile_id link (D2)
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

create index if not exists idx_tenants_profile_id on public.tenants (profile_id);

-- One ACTIVE tenant record per profile; historical inactive rows unrestricted.
-- NULL profile_id = legacy/unlinked, unrestricted.
create unique index if not exists uq_tenants_one_active_per_profile_idx
  on public.tenants (profile_id)
  where status = 'active' and profile_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Hardened ownership helper in private schema (D5)
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
grant execute on function private.is_property_owner(uuid) to authenticated;

-- Keep public wrapper for existing policies (compat); delegates to private.
create or replace function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_property_owner(p_property_id);
$$;

revoke all on function public.is_property_owner(uuid) from public;
grant execute on function public.is_property_owner(uuid) to authenticated;

-- Tenant-self helper: true when the tenant row belongs to the caller.
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
grant execute on function private.is_own_tenant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Auth sync: profiles email + default role (D1)
-- Auto-provisioned role is ALWAYS 'owner'. Never trust user_metadata for
-- authorization (SEC). Tenant role is assigned later via controlled flow.
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

-- Guard: role can only move owner -> tenant (controlled tenant onboarding).
-- Blocks tenant -> owner self-escalation and any other value through Data API.
-- ponytail: SECURITY DEFINER service flows also hit this trigger; full
-- invite/accept flow with audit lands in Slice 2+.
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
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

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
before update of role on public.profiles
for each row execute function public.guard_profile_role_change();

-- Guard: tenants.profile_id cannot be relinked from one profile to another
-- (prevents stealing/linking abuse). null -> set once allowed; unlink to
-- null allowed for offboarding; A -> B blocked.
create or replace function public.prevent_tenant_profile_relink()
returns trigger
language plpgsql
as $$
begin
  if old.profile_id is distinct from new.profile_id
     and old.profile_id is not null and new.profile_id is not null then
    raise exception 'Tenant profile link cannot be changed once set';
  end if;
  return new;
end;
$$;

drop trigger if exists tenants_prevent_profile_relink on public.tenants;
create trigger tenants_prevent_profile_relink
before update of profile_id on public.tenants
for each row execute function public.prevent_tenant_profile_relink();

-- ---------------------------------------------------------------------------
-- 5. RLS: tenant self-access (foundation only, owner policies untouched)
-- ---------------------------------------------------------------------------
-- tenants: allow a linked tenant to read their own row(s).
drop policy if exists tenants_select_own_link on public.tenants;
create policy tenants_select_own_link on public.tenants
  for select to authenticated
  using (private.is_own_tenant(profile_id));

-- payments: allow a linked tenant to read their own payment rows.
drop policy if exists payments_select_own_tenant on public.payments;
create policy payments_select_own_tenant on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.tenants t
       where t.id = payments.tenant_id
         and private.is_own_tenant(t.profile_id)
    )
  );
