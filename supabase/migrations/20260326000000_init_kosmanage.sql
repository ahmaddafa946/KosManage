-- KosManage initial schema: tables, constraints, indexes, triggers, RLS
-- Migration: 20260326000000_init_kosmanage

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.compute_payment_status(
  p_amount_due numeric,
  p_amount_paid numeric,
  p_due_date date,
  p_as_of date default current_date
)
returns text
language plpgsql
immutable
as $$
begin
  if p_amount_paid >= p_amount_due then
    return 'paid';
  elsif p_as_of > p_due_date then
    return 'overdue';
  elsif p_amount_paid > 0 then
    return 'partial';
  else
    return 'unpaid';
  end if;
end;
$$;

create or replace function public.payments_set_status()
returns trigger
language plpgsql
as $$
begin
  new.status := public.compute_payment_status(
    new.amount_due,
    new.amount_paid,
    new.due_date,
    current_date
  );
  return new;
end;
$$;

create or replace function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and p.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_property_owner(uuid) from public;
grant execute on function public.is_property_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_owner_id on public.properties (owner_id);

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  room_number text not null,
  floor int,
  price numeric(12, 2) not null check (price >= 0),
  status text not null default 'available'
    check (status in ('available', 'occupied', 'maintenance')),
  facilities text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, room_number)
);

create index idx_rooms_property_id on public.rooms (property_id);
create index idx_rooms_property_status on public.rooms (property_id, status);

create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete restrict,
  name text not null,
  phone text,
  email text,
  identity_number text,
  start_date date not null,
  end_date date,
  rent_price numeric(12, 2) not null check (rent_price >= 0),
  deposit numeric(12, 2) check (deposit is null or deposit >= 0),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (status <> 'active' or room_id is not null)
);

create unique index uq_tenants_one_active_per_room
  on public.tenants (room_id)
  where status = 'active' and room_id is not null;

create index idx_tenants_property_id on public.tenants (property_id);
create index idx_tenants_room_id on public.tenants (room_id);
create index idx_tenants_property_status on public.tenants (property_id, status);

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

-- Occupancy sync + maintenance / same-property guards
create or replace function public.sync_room_occupancy_from_tenant()
returns trigger
language plpgsql
as $$
declare
  v_room public.rooms%rowtype;
  v_old_room_id uuid;
  v_new_room_id uuid;
begin
  if tg_op = 'DELETE' then
    v_old_room_id := old.room_id;
    if v_old_room_id is not null then
      if not exists (
        select 1 from public.tenants t
        where t.room_id = v_old_room_id and t.status = 'active'
      ) then
        update public.rooms r
        set status = 'available', updated_at = now()
        where r.id = v_old_room_id
          and r.status = 'occupied';
      end if;
    end if;
    return old;
  end if;

  v_old_room_id := case when tg_op = 'UPDATE' then old.room_id else null end;
  v_new_room_id := new.room_id;

  if new.status = 'active' then
    if new.room_id is null then
      raise exception 'Active tenant must have a room';
    end if;

    select * into v_room from public.rooms where id = new.room_id for update;
    if not found then
      raise exception 'Room not found';
    end if;

    if v_room.property_id <> new.property_id then
      raise exception 'Tenant property_id must match room.property_id';
    end if;

    if v_room.status = 'maintenance' then
      raise exception 'Cannot assign tenant to a room in maintenance';
    end if;

    update public.rooms
    set status = 'occupied', updated_at = now()
    where id = new.room_id;
  end if;

  -- If room changed or tenant deactivated, free previous room when empty
  if tg_op = 'UPDATE'
     and v_old_room_id is not null
     and (
       v_old_room_id is distinct from new.room_id
       or new.status = 'inactive'
       or (old.status = 'active' and new.status <> 'active')
     )
  then
    if not exists (
      select 1 from public.tenants t
      where t.room_id = v_old_room_id
        and t.status = 'active'
        and t.id <> new.id
    ) then
      update public.rooms r
      set status = 'available', updated_at = now()
      where r.id = v_old_room_id
        and r.status = 'occupied';
    end if;
  end if;

  return new;
end;
$$;

create trigger tenants_sync_room_occupancy
after insert or update or delete on public.tenants
for each row execute function public.sync_room_occupancy_from_tenant();

-- Prevent deleting occupied rooms
create or replace function public.prevent_delete_occupied_room()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.tenants t
    where t.room_id = old.id and t.status = 'active'
  ) then
    raise exception 'Cannot delete a room with an active tenant';
  end if;
  return old;
end;
$$;

create trigger rooms_prevent_delete_occupied
before delete on public.rooms
for each row execute function public.prevent_delete_occupied_room();

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  room_id uuid references public.rooms (id) on delete set null,
  billing_period text not null
    check (billing_period ~ '^[0-9]{4}-[0-9]{2}$'),
  due_date date not null,
  amount_due numeric(12, 2) not null check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  payment_date date,
  payment_method text
    check (payment_method is null or payment_method in ('cash', 'transfer', 'ewallet')),
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partial', 'paid', 'overdue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, billing_period)
);

create index idx_payments_property_id on public.payments (property_id);
create index idx_payments_tenant_id on public.payments (tenant_id);
create index idx_payments_property_status on public.payments (property_id, status);
create index idx_payments_due_date on public.payments (due_date);
create index idx_payments_billing_period on public.payments (billing_period);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger payments_set_status
before insert or update of amount_due, amount_paid, due_date on public.payments
for each row execute function public.payments_set_status();

create or replace function public.validate_payment_relations()
returns trigger
language plpgsql
as $$
declare
  v_tenant public.tenants%rowtype;
begin
  select * into v_tenant from public.tenants where id = new.tenant_id;
  if not found then
    raise exception 'Tenant not found';
  end if;
  if v_tenant.property_id <> new.property_id then
    raise exception 'Payment property_id must match tenant.property_id';
  end if;
  if new.room_id is null then
    new.room_id := v_tenant.room_id;
  end if;
  return new;
end;
$$;

create trigger payments_validate_relations
before insert or update on public.payments
for each row execute function public.validate_payment_relations();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.tenants enable row level security;
alter table public.payments enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- properties
create policy properties_select_own on public.properties
  for select to authenticated
  using (owner_id = auth.uid());

create policy properties_insert_own on public.properties
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy properties_update_own on public.properties
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy properties_delete_own on public.properties
  for delete to authenticated
  using (owner_id = auth.uid());

-- rooms
create policy rooms_select_own on public.rooms
  for select to authenticated
  using (public.is_property_owner(property_id));

create policy rooms_insert_own on public.rooms
  for insert to authenticated
  with check (public.is_property_owner(property_id));

create policy rooms_update_own on public.rooms
  for update to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

create policy rooms_delete_own on public.rooms
  for delete to authenticated
  using (public.is_property_owner(property_id));

-- tenants
create policy tenants_select_own on public.tenants
  for select to authenticated
  using (public.is_property_owner(property_id));

create policy tenants_insert_own on public.tenants
  for insert to authenticated
  with check (public.is_property_owner(property_id));

create policy tenants_update_own on public.tenants
  for update to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

create policy tenants_delete_own on public.tenants
  for delete to authenticated
  using (public.is_property_owner(property_id));

-- payments
create policy payments_select_own on public.payments
  for select to authenticated
  using (public.is_property_owner(property_id));

create policy payments_insert_own on public.payments
  for insert to authenticated
  with check (public.is_property_owner(property_id));

create policy payments_update_own on public.payments
  for update to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

create policy payments_delete_own on public.payments
  for delete to authenticated
  using (public.is_property_owner(property_id));
